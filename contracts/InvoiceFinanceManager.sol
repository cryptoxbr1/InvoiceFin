// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ILiquidityPool {
    function transferForFinancing(address to, uint256 amount, bytes32 invoiceId) external;
    function receiveRepayment(uint256 amount, bytes32 invoiceId) external;
    function getPoolBalance() external view returns (uint256);
    function asset() external view returns (IERC20);
}

interface IInvoiceRegistry {
    enum Status { Pending, Financed, Repaid, Defaulted, Cancelled }
    
    struct Invoice {
        address seller;
        address buyer;
        uint256 faceValue;
        uint256 advanceAmount;
        uint256 advanceRate;
        uint256 feeAmount;
        uint64 dueDate;
        uint64 registeredAt;
        uint64 financedAt;
        uint64 repaidAt;
        uint8 riskScore;
        Status status;
        string invoiceNumber;
        bytes32 documentHash;
    }
    
    function getInvoice(bytes32 invoiceId) external view returns (Invoice memory);
    function markFinanced(bytes32 invoiceId, uint256 advanceAmount, uint256 advanceRate, uint256 feeAmount) external;
    function markRepaid(bytes32 invoiceId, uint256 amount) external;
    function markDefaulted(bytes32 invoiceId) external;
}

/**
 * @title InvoiceFinanceManager
 * @notice Orchestrates invoice financing between the registry and liquidity pool
 * @dev Calculates financing terms based on risk scores and manages the lifecycle
 */
contract InvoiceFinanceManager is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    ILiquidityPool public immutable pool;
    IInvoiceRegistry public immutable registry;
    IERC20 public immutable asset;
    
    // Financing parameters (in basis points, 10000 = 100%)
    uint256 public baseAdvanceRate = 7000;      // 70% base advance
    uint256 public maxAdvanceRate = 8000;       // 80% max advance
    uint256 public minAdvanceRate = 6000;       // 60% min advance
    uint256 public baseFeeRate = 150;           // 1.5% base fee
    uint256 public minRiskScore = 30;           // Minimum acceptable risk score
    
    // Pool utilization limits
    uint256 public maxPoolUtilization = 8000;   // 80% max pool usage
    uint256 public maxSingleInvoice = 1000;     // 10% max per invoice
    
    mapping(bytes32 => bool) public invoiceFinanced;
    
    uint256 public totalFinanced;
    uint256 public totalRepaid;
    uint256 public totalFees;
    
    event InvoiceFinanced(
        bytes32 indexed invoiceId,
        address indexed seller,
        uint256 advanceAmount,
        uint256 feeAmount,
        uint256 advanceRate
    );
    
    event InvoiceRepaid(
        bytes32 indexed invoiceId,
        address indexed payer,
        uint256 amount
    );
    
    event ParametersUpdated(
        uint256 baseAdvanceRate,
        uint256 baseFeeRate,
        uint256 minRiskScore
    );

    constructor(
        ILiquidityPool _pool,
        IInvoiceRegistry _registry
    ) Ownable(msg.sender) {
        pool = _pool;
        registry = _registry;
        asset = _pool.asset();
    }

    /**
     * @notice Finance an invoice - transfers advance to seller
     * @param invoiceId Invoice to finance
     */
    function finance(bytes32 invoiceId) external nonReentrant whenNotPaused {
        IInvoiceRegistry.Invoice memory inv = registry.getInvoice(invoiceId);
        
        require(inv.seller != address(0), "Invoice not found");
        require(inv.status == IInvoiceRegistry.Status.Pending, "Invalid status");
        require(inv.riskScore >= minRiskScore, "Risk score too low");
        require(!invoiceFinanced[invoiceId], "Already financed");
        
        // Calculate financing terms based on risk score
        (uint256 advanceAmount, uint256 advanceRate, uint256 feeAmount) = 
            calculateFinancingTerms(inv.faceValue, inv.riskScore);
        
        // Check pool constraints
        uint256 poolBalance = pool.getPoolBalance();
        require(advanceAmount <= (poolBalance * maxSingleInvoice) / 10000, "Exceeds single invoice limit");
        require(advanceAmount <= (poolBalance * maxPoolUtilization) / 10000, "Exceeds pool utilization");
        
        // Mark as financed
        invoiceFinanced[invoiceId] = true;
        totalFinanced += advanceAmount;
        totalFees += feeAmount;
        
        // Update registry
        registry.markFinanced(invoiceId, advanceAmount, advanceRate, feeAmount);
        
        // Transfer funds from pool to seller
        pool.transferForFinancing(inv.seller, advanceAmount, invoiceId);
        
        emit InvoiceFinanced(invoiceId, inv.seller, advanceAmount, feeAmount, advanceRate);
    }

    /**
     * @notice Repay a financed invoice
     * @param invoiceId Invoice to repay
     * @param amount Amount to repay
     */
    function repay(bytes32 invoiceId, uint256 amount) external nonReentrant {
        IInvoiceRegistry.Invoice memory inv = registry.getInvoice(invoiceId);
        
        require(inv.status == IInvoiceRegistry.Status.Financed, "Not financed");
        require(amount > 0, "Amount must be > 0");
        
        // Calculate required repayment (advance + fee)
        uint256 requiredRepayment = inv.advanceAmount + inv.feeAmount;
        require(amount >= requiredRepayment, "Insufficient repayment amount");
        
        totalRepaid += amount;
        
        // Transfer repayment to pool
        asset.safeTransferFrom(msg.sender, address(pool), amount);
        
        // Update registry
        registry.markRepaid(invoiceId, amount);
        
        emit InvoiceRepaid(invoiceId, msg.sender, amount);
    }

    /**
     * @notice Mark an overdue invoice as defaulted (admin only)
     * @param invoiceId Invoice that has defaulted
     */
    function markDefault(bytes32 invoiceId) external onlyOwner {
        IInvoiceRegistry.Invoice memory inv = registry.getInvoice(invoiceId);
        
        require(inv.status == IInvoiceRegistry.Status.Financed, "Not financed");
        require(block.timestamp > inv.dueDate + 30 days, "Not yet overdue");
        
        registry.markDefaulted(invoiceId);
    }

    /**
     * @notice Calculate financing terms based on face value and risk score
     * @param faceValue Invoice face value
     * @param riskScore Risk score (0-100, higher is better)
     * @return advanceAmount Amount to advance
     * @return advanceRate Rate in basis points
     * @return feeAmount Fee amount
     */
    function calculateFinancingTerms(uint256 faceValue, uint8 riskScore) 
        public 
        view 
        returns (uint256 advanceAmount, uint256 advanceRate, uint256 feeAmount) 
    {
        // Higher risk score = higher advance rate
        // Risk score 100 = max rate, Risk score minRiskScore = base rate
        uint256 riskRange = 100 - minRiskScore;
        uint256 rateRange = maxAdvanceRate - baseAdvanceRate;
        
        if (riskScore >= 100) {
            advanceRate = maxAdvanceRate;
        } else if (riskScore <= minRiskScore) {
            advanceRate = baseAdvanceRate;
        } else {
            uint256 riskAboveMin = riskScore - minRiskScore;
            advanceRate = baseAdvanceRate + (riskAboveMin * rateRange) / riskRange;
        }
        
        advanceAmount = (faceValue * advanceRate) / 10000;
        feeAmount = (advanceAmount * baseFeeRate) / 10000;
        advanceAmount = advanceAmount - feeAmount; // Fee is deducted from advance
        
        return (advanceAmount, advanceRate, feeAmount);
    }

    /**
     * @notice Get financing quote without executing
     * @param faceValue Invoice face value
     * @param riskScore Risk score
     */
    function getFinancingQuote(uint256 faceValue, uint8 riskScore) 
        external 
        view 
        returns (
            uint256 advanceAmount,
            uint256 advanceRate,
            uint256 feeAmount,
            bool isEligible
        ) 
    {
        if (riskScore < minRiskScore) {
            return (0, 0, 0, false);
        }
        
        (advanceAmount, advanceRate, feeAmount) = calculateFinancingTerms(faceValue, riskScore);
        
        uint256 poolBalance = pool.getPoolBalance();
        bool poolHasFunds = advanceAmount <= (poolBalance * maxPoolUtilization) / 10000;
        bool withinSingleLimit = advanceAmount <= (poolBalance * maxSingleInvoice) / 10000;
        
        isEligible = poolHasFunds && withinSingleLimit;
        
        return (advanceAmount, advanceRate, feeAmount, isEligible);
    }

    // Admin functions
    
    function updateParameters(
        uint256 _baseAdvanceRate,
        uint256 _baseFeeRate,
        uint256 _minRiskScore
    ) external onlyOwner {
        require(_baseAdvanceRate >= minAdvanceRate && _baseAdvanceRate <= maxAdvanceRate, "Invalid advance rate");
        require(_baseFeeRate <= 500, "Fee too high"); // Max 5%
        require(_minRiskScore <= 100, "Invalid risk score");
        
        baseAdvanceRate = _baseAdvanceRate;
        baseFeeRate = _baseFeeRate;
        minRiskScore = _minRiskScore;
        
        emit ParametersUpdated(_baseAdvanceRate, _baseFeeRate, _minRiskScore);
    }

    function updatePoolLimits(
        uint256 _maxPoolUtilization,
        uint256 _maxSingleInvoice
    ) external onlyOwner {
        require(_maxPoolUtilization <= 10000, "Invalid utilization");
        require(_maxSingleInvoice <= 10000, "Invalid single limit");
        
        maxPoolUtilization = _maxPoolUtilization;
        maxSingleInvoice = _maxSingleInvoice;
    }

    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }

    function getStats() external view returns (
        uint256 _totalFinanced,
        uint256 _totalRepaid,
        uint256 _totalFees,
        uint256 _poolBalance
    ) {
        return (totalFinanced, totalRepaid, totalFees, pool.getPoolBalance());
    }
}
