# InvoiceFin Smart Contracts

Smart contracts for the InvoiceFin invoice financing platform on Polygon.

## Contracts

### 1. LiquidityPool.sol
Manages liquidity deposits from providers who want to earn yield by funding invoice advances.

**Key Functions:**
- `deposit(amount)` - Deposit WMATIC to earn shares in the pool
- `withdraw(shareAmount)` - Withdraw your share of the pool
- `getShareValue(user)` - Get current value of user's shares
- `getPricePerShare()` - Get current price per share (increases with yield)

### 2. InvoiceRegistry.sol
Stores and manages the lifecycle of invoices on-chain.

**Key Functions:**
- `register(...)` - Register a new invoice for potential financing
- `getInvoice(id)` - Get invoice details
- `cancel(id)` - Cancel a pending invoice (seller only)

**Invoice Statuses:**
- Pending → Financed → Repaid/Defaulted
- Pending → Cancelled

### 3. InvoiceFinanceManager.sol
Orchestrates the financing process between the registry and pool.

**Key Functions:**
- `finance(invoiceId)` - Finance an eligible invoice
- `repay(invoiceId, amount)` - Repay a financed invoice
- `getFinancingQuote(faceValue, riskScore)` - Get a quote without committing
- `calculateFinancingTerms(...)` - Calculate advance amount and fees

**Financing Terms:**
- Base advance rate: 70% of face value
- Max advance rate: 80% (for high risk scores)
- Min advance rate: 60% (for low risk scores)
- Fee: 1.5% of advance amount
- Minimum risk score: 30

### 4. WMATIC.sol
Wrapped MATIC token for testnet. Use official WMATIC on mainnet.

## Deployment Order

1. Deploy WMATIC (or use official: `0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270` on mainnet)
2. Deploy LiquidityPool with WMATIC address
3. Deploy InvoiceRegistry
4. Deploy InvoiceFinanceManager with pool and registry addresses
5. Call `pool.setFinanceManager(financeManagerAddress)`
6. Call `registry.setFinanceManager(financeManagerAddress)`

## Network Addresses

### Polygon Mainnet
- WMATIC: `0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270`

### Polygon Amoy Testnet
Deploy your own contracts and update addresses in the app config.

## Hardhat Deployment Script

```javascript
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  // Deploy WMATIC (for testnet only)
  const WMATIC = await ethers.getContractFactory("WMATIC");
  const wmatic = await WMATIC.deploy();
  await wmatic.waitForDeployment();
  console.log("WMATIC deployed to:", await wmatic.getAddress());

  // Deploy LiquidityPool
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
  const pool = await LiquidityPool.deploy(await wmatic.getAddress());
  await pool.waitForDeployment();
  console.log("LiquidityPool deployed to:", await pool.getAddress());

  // Deploy InvoiceRegistry
  const InvoiceRegistry = await ethers.getContractFactory("InvoiceRegistry");
  const registry = await InvoiceRegistry.deploy();
  await registry.waitForDeployment();
  console.log("InvoiceRegistry deployed to:", await registry.getAddress());

  // Deploy InvoiceFinanceManager
  const InvoiceFinanceManager = await ethers.getContractFactory("InvoiceFinanceManager");
  const manager = await InvoiceFinanceManager.deploy(
    await pool.getAddress(),
    await registry.getAddress()
  );
  await manager.waitForDeployment();
  console.log("InvoiceFinanceManager deployed to:", await manager.getAddress());

  // Set finance manager on pool and registry
  await pool.setFinanceManager(await manager.getAddress());
  await registry.setFinanceManager(await manager.getAddress());
  console.log("Finance manager configured");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

## Testing

```bash
npx hardhat test
```

## Security Considerations

- All contracts use OpenZeppelin's ReentrancyGuard
- Owner-only admin functions for parameter updates
- Pausable functionality for emergency stops
- Risk score validation prevents financing of risky invoices
- Pool utilization limits prevent over-exposure
