// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LiquidityPool
 * @notice Manages liquidity deposits for invoice financing on Polygon
 * @dev Uses share-based accounting for fair yield distribution
 */
contract LiquidityPool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;
    
    uint256 public totalShares;
    mapping(address => uint256) public shares;
    mapping(address => uint256) public depositTimestamp;
    
    address public financeManager;
    
    uint256 public constant MIN_DEPOSIT = 1e15; // 0.001 token minimum
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;
    
    event Deposited(address indexed user, uint256 amount, uint256 sharesMinted);
    event Withdrawn(address indexed user, uint256 sharesBurned, uint256 amountReceived);
    event FinanceManagerSet(address indexed manager);
    event FundsTransferred(address indexed to, uint256 amount, bytes32 indexed invoiceId);
    event FundsReceived(address indexed from, uint256 amount, bytes32 indexed invoiceId);

    constructor(IERC20 _asset) Ownable(msg.sender) {
        asset = _asset;
    }

    modifier onlyFinanceManager() {
        require(msg.sender == financeManager, "Only finance manager");
        _;
    }

    function setFinanceManager(address _manager) external onlyOwner {
        financeManager = _manager;
        emit FinanceManagerSet(_manager);
    }

    /**
     * @notice Deposit assets into the liquidity pool
     * @param amount Amount of tokens to deposit
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount >= MIN_DEPOSIT, "Amount too small");
        
        uint256 poolBalance = asset.balanceOf(address(this));
        uint256 sharesToMint;
        
        if (totalShares == 0 || poolBalance == 0) {
            sharesToMint = amount;
        } else {
            sharesToMint = (amount * totalShares) / poolBalance;
        }
        
        require(sharesToMint > 0, "Shares must be > 0");
        
        totalShares += sharesToMint;
        shares[msg.sender] += sharesToMint;
        depositTimestamp[msg.sender] = block.timestamp;
        totalDeposited += amount;
        
        asset.safeTransferFrom(msg.sender, address(this), amount);
        
        emit Deposited(msg.sender, amount, sharesToMint);
    }

    /**
     * @notice Withdraw assets from the liquidity pool
     * @param shareAmount Number of shares to burn for withdrawal
     */
    function withdraw(uint256 shareAmount) external nonReentrant {
        require(shareAmount > 0, "Shares must be > 0");
        require(shareAmount <= shares[msg.sender], "Insufficient shares");
        
        uint256 poolBalance = asset.balanceOf(address(this));
        uint256 amountToWithdraw = (shareAmount * poolBalance) / totalShares;
        
        require(amountToWithdraw > 0, "Amount must be > 0");
        require(amountToWithdraw <= poolBalance, "Insufficient pool balance");
        
        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;
        totalWithdrawn += amountToWithdraw;
        
        asset.safeTransfer(msg.sender, amountToWithdraw);
        
        emit Withdrawn(msg.sender, shareAmount, amountToWithdraw);
    }

    /**
     * @notice Transfer funds to finance an invoice (called by FinanceManager)
     * @param to Recipient address (invoice seller)
     * @param amount Amount to transfer
     * @param invoiceId Invoice identifier
     */
    function transferForFinancing(address to, uint256 amount, bytes32 invoiceId) 
        external 
        onlyFinanceManager 
        nonReentrant 
    {
        require(amount <= asset.balanceOf(address(this)), "Insufficient pool funds");
        asset.safeTransfer(to, amount);
        emit FundsTransferred(to, amount, invoiceId);
    }

    /**
     * @notice Receive repayment for a financed invoice
     * @param amount Amount being repaid
     * @param invoiceId Invoice identifier
     */
    function receiveRepayment(uint256 amount, bytes32 invoiceId) external nonReentrant {
        asset.safeTransferFrom(msg.sender, address(this), amount);
        emit FundsReceived(msg.sender, amount, invoiceId);
    }

    // View functions
    
    function getShareValue(address user) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares[user] * asset.balanceOf(address(this))) / totalShares;
    }
    
    function getPoolBalance() external view returns (uint256) {
        return asset.balanceOf(address(this));
    }
    
    function getSharesOf(address user) external view returns (uint256) {
        return shares[user];
    }
    
    function getPricePerShare() external view returns (uint256) {
        if (totalShares == 0) return 1e18;
        return (asset.balanceOf(address(this)) * 1e18) / totalShares;
    }
    
    function getPoolStats() external view returns (
        uint256 _totalShares,
        uint256 _poolBalance,
        uint256 _totalDeposited,
        uint256 _totalWithdrawn,
        uint256 _pricePerShare
    ) {
        uint256 balance = asset.balanceOf(address(this));
        return (
            totalShares,
            balance,
            totalDeposited,
            totalWithdrawn,
            totalShares == 0 ? 1e18 : (balance * 1e18) / totalShares
        );
    }
}
