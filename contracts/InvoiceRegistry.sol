// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title InvoiceRegistry
 * @notice Manages invoice registration and lifecycle on Polygon
 * @dev Stores invoice metadata and tracks financing status
 */
contract InvoiceRegistry is Ownable, Pausable {
    
    enum Status { 
        Pending,    // Invoice registered, awaiting financing
        Financed,   // Invoice has been financed
        Repaid,     // Invoice has been fully repaid
        Defaulted,  // Invoice has defaulted
        Cancelled   // Invoice was cancelled
    }
    
    struct Invoice {
        address seller;         // Business selling the invoice
        address buyer;          // Customer who owes the invoice
        uint256 faceValue;      // Original invoice amount
        uint256 advanceAmount;  // Amount advanced to seller
        uint256 advanceRate;    // Percentage of face value advanced (basis points)
        uint256 feeAmount;      // Financing fee
        uint64 dueDate;         // When payment is due
        uint64 registeredAt;    // When invoice was registered
        uint64 financedAt;      // When invoice was financed
        uint64 repaidAt;        // When invoice was repaid
        uint8 riskScore;        // AI-generated risk score (0-100)
        Status status;
        string invoiceNumber;   // Off-chain invoice reference
        bytes32 documentHash;   // Hash of invoice document for verification
    }
    
    mapping(bytes32 => Invoice) public invoices;
    mapping(address => bytes32[]) public sellerInvoices;
    mapping(address => bytes32[]) public buyerInvoices;
    
    address public financeManager;
    
    uint256 public totalInvoicesRegistered;
    uint256 public totalInvoicesFinanced;
    uint256 public totalValueFinanced;
    
    event InvoiceRegistered(
        bytes32 indexed invoiceId,
        address indexed seller,
        address indexed buyer,
        uint256 faceValue,
        uint64 dueDate
    );
    
    event InvoiceFinanced(
        bytes32 indexed invoiceId,
        uint256 advanceAmount,
        uint256 feeAmount
    );
    
    event InvoiceRepaid(
        bytes32 indexed invoiceId,
        uint256 amount
    );
    
    event InvoiceDefaulted(bytes32 indexed invoiceId);
    event InvoiceCancelled(bytes32 indexed invoiceId);
    event FinanceManagerSet(address indexed manager);

    constructor() Ownable(msg.sender) {}

    modifier onlyFinanceManager() {
        require(msg.sender == financeManager, "Only finance manager");
        _;
    }
    
    modifier onlySeller(bytes32 invoiceId) {
        require(invoices[invoiceId].seller == msg.sender, "Not invoice seller");
        _;
    }

    function setFinanceManager(address _manager) external onlyOwner {
        financeManager = _manager;
        emit FinanceManagerSet(_manager);
    }

    /**
     * @notice Register a new invoice for potential financing
     * @param invoiceId Unique identifier (hash of invoice data)
     * @param buyer Customer address
     * @param faceValue Invoice amount
     * @param dueDate Payment due date
     * @param riskScore AI-assessed risk score
     * @param invoiceNumber Off-chain invoice reference
     * @param documentHash Hash of invoice document
     */
    function register(
        bytes32 invoiceId,
        address buyer,
        uint256 faceValue,
        uint64 dueDate,
        uint8 riskScore,
        string calldata invoiceNumber,
        bytes32 documentHash
    ) external whenNotPaused {
        require(invoices[invoiceId].seller == address(0), "Invoice already exists");
        require(buyer != address(0), "Invalid buyer address");
        require(faceValue > 0, "Face value must be > 0");
        require(dueDate > block.timestamp, "Due date must be in future");
        require(riskScore <= 100, "Risk score must be 0-100");
        
        invoices[invoiceId] = Invoice({
            seller: msg.sender,
            buyer: buyer,
            faceValue: faceValue,
            advanceAmount: 0,
            advanceRate: 0,
            feeAmount: 0,
            dueDate: dueDate,
            registeredAt: uint64(block.timestamp),
            financedAt: 0,
            repaidAt: 0,
            riskScore: riskScore,
            status: Status.Pending,
            invoiceNumber: invoiceNumber,
            documentHash: documentHash
        });
        
        sellerInvoices[msg.sender].push(invoiceId);
        buyerInvoices[buyer].push(invoiceId);
        totalInvoicesRegistered++;
        
        emit InvoiceRegistered(invoiceId, msg.sender, buyer, faceValue, dueDate);
    }

    /**
     * @notice Mark invoice as financed (called by FinanceManager)
     * @param invoiceId Invoice identifier
     * @param advanceAmount Amount advanced to seller
     * @param advanceRate Rate in basis points
     * @param feeAmount Financing fee
     */
    function markFinanced(
        bytes32 invoiceId,
        uint256 advanceAmount,
        uint256 advanceRate,
        uint256 feeAmount
    ) external onlyFinanceManager {
        Invoice storage inv = invoices[invoiceId];
        require(inv.seller != address(0), "Invoice not found");
        require(inv.status == Status.Pending, "Invalid status");
        
        inv.advanceAmount = advanceAmount;
        inv.advanceRate = advanceRate;
        inv.feeAmount = feeAmount;
        inv.financedAt = uint64(block.timestamp);
        inv.status = Status.Financed;
        
        totalInvoicesFinanced++;
        totalValueFinanced += advanceAmount;
        
        emit InvoiceFinanced(invoiceId, advanceAmount, feeAmount);
    }

    /**
     * @notice Mark invoice as repaid (called by FinanceManager)
     * @param invoiceId Invoice identifier
     * @param amount Amount repaid
     */
    function markRepaid(bytes32 invoiceId, uint256 amount) external onlyFinanceManager {
        Invoice storage inv = invoices[invoiceId];
        require(inv.status == Status.Financed, "Invoice not financed");
        
        inv.repaidAt = uint64(block.timestamp);
        inv.status = Status.Repaid;
        
        emit InvoiceRepaid(invoiceId, amount);
    }

    /**
     * @notice Mark invoice as defaulted (called by FinanceManager)
     * @param invoiceId Invoice identifier
     */
    function markDefaulted(bytes32 invoiceId) external onlyFinanceManager {
        Invoice storage inv = invoices[invoiceId];
        require(inv.status == Status.Financed, "Invoice not financed");
        
        inv.status = Status.Defaulted;
        emit InvoiceDefaulted(invoiceId);
    }

    /**
     * @notice Cancel a pending invoice (only by seller)
     * @param invoiceId Invoice identifier
     */
    function cancel(bytes32 invoiceId) external onlySeller(invoiceId) {
        Invoice storage inv = invoices[invoiceId];
        require(inv.status == Status.Pending, "Can only cancel pending invoices");
        
        inv.status = Status.Cancelled;
        emit InvoiceCancelled(invoiceId);
    }

    // View functions
    
    function getInvoice(bytes32 invoiceId) external view returns (Invoice memory) {
        return invoices[invoiceId];
    }
    
    function getSellerInvoiceCount(address seller) external view returns (uint256) {
        return sellerInvoices[seller].length;
    }
    
    function getBuyerInvoiceCount(address buyer) external view returns (uint256) {
        return buyerInvoices[buyer].length;
    }
    
    function getSellerInvoices(address seller) external view returns (bytes32[] memory) {
        return sellerInvoices[seller];
    }
    
    function getRegistryStats() external view returns (
        uint256 _totalRegistered,
        uint256 _totalFinanced,
        uint256 _totalValueFinanced
    ) {
        return (totalInvoicesRegistered, totalInvoicesFinanced, totalValueFinanced);
    }

    // Admin functions
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
}
