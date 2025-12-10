# InvoiceFin - AI-Powered Invoice Financing Platform

A production-ready invoice financing platform built for the Polygon Buildathon, combining AI-powered invoice verification with instant blockchain-based liquidity provision.

## Overview

InvoiceFin enables businesses to get immediate cash flow by financing their invoices. Using Gemini AI for intelligent document analysis and fraud detection, and Polygon POS for fast, low-cost transactions, businesses can receive 70-80% of their invoice value within minutes.

## Key Features

### For Businesses
- **Instant Invoice Financing**: Upload invoices and receive up to 80% advance on Polygon network
- **AI-Powered Verification**: Gemini AI analyzes invoices for authenticity and extracts key data
- **Fraud Detection**: Advanced AI algorithms detect suspicious patterns and fraudulent invoices
- **Risk Scoring**: Dynamic risk assessment that improves with repayment history
- **Multi-Currency Support**: Support for USD, EUR, GBP, MATIC, USDC, and USDT

### For Liquidity Providers
- **Earn Yield**: Provide MATIC to the liquidity pool and earn competitive APY
- **AI-Verified Quality**: All financed invoices are vetted by AI analysis
- **Real-World Asset Backing**: Investments are backed by actual business invoices
- **Transparent Operations**: All transactions recorded on Polygon blockchain

## Technology Stack

### Frontend
- React with TypeScript
- TanStack Query for data fetching
- Tailwind CSS with shadcn/ui components
- Wouter for routing
- Recharts for data visualization

### Backend
- Express.js with TypeScript
- Drizzle ORM with PostgreSQL
- Replit Auth for authentication
- Multer for file uploads

### AI & Blockchain
- **Gemini AI**: Invoice parsing, fraud detection, and risk assessment
- **Polygon POS**: Fast, low-cost transactions on mainnet
- Real-time gas price and MATIC price feeds
- MetaMask wallet integration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  Landing │ Dashboard │ Invoices │ Transactions │ Liquidity  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend API                              │
│     Auth │ Business │ Invoice │ Transaction │ Liquidity     │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  PostgreSQL │    │   Gemini AI      │    │  Polygon RPC    │
│  Database   │    │  Analysis        │    │  Network        │
└─────────────┘    └─────────────────┘    └─────────────────┘
```

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Gemini API key
- MetaMask or compatible Web3 wallet

### Environment Variables
```env
DATABASE_URL=postgresql://...
GEMINI_API_KEY=your-gemini-api-key
SESSION_SECRET=your-session-secret
ISSUER_URL=https://replit.com/oidc
REPL_ID=your-repl-id
```

### Installation
```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `GET /api/login` - Initiate OAuth login
- `GET /api/callback` - OAuth callback
- `GET /api/logout` - Logout
- `GET /api/auth/user` - Get current user
- `POST /api/auth/wallet` - Update wallet address

### Business
- `GET /api/business` - Get user's business
- `POST /api/business` - Register business
- `PATCH /api/business/:id` - Update business

### Invoices
- `GET /api/invoices` - List all invoices
- `GET /api/invoices/:id` - Get invoice details
- `POST /api/invoices` - Create invoice
- `POST /api/invoices/analyze` - AI analysis (file upload)
- `POST /api/invoices/:id/verify` - Verify with fraud detection
- `POST /api/invoices/:id/finance` - Finance invoice
- `POST /api/invoices/:id/repay` - Mark as repaid

### Transactions
- `GET /api/transactions` - List transactions
- `GET /api/transactions/:txHash/status` - Check transaction status

### Liquidity Pool
- `GET /api/liquidity` - Get pool info and user deposits
- `POST /api/liquidity/deposit` - Add liquidity
- `POST /api/liquidity/:id/withdraw` - Withdraw liquidity

### Network Status
- `GET /api/polygon/status` - Network health and block info
- `GET /api/polygon/gas` - Gas price estimates
- `GET /api/polygon/price` - MATIC price
- `GET /api/exchange-rates` - All exchange rates

## Invoice Financing Flow

1. **Register Business**: Complete KYC with company details
2. **Upload Invoice**: Submit invoice document (PDF/image)
3. **AI Analysis**: Gemini extracts data and verifies authenticity
4. **Fraud Detection**: AI checks for suspicious patterns
5. **Risk Scoring**: Calculate risk-adjusted financing percentage
6. **Finance**: Receive 70-80% of invoice value in MATIC
7. **Repay**: When buyer pays, repay the financed amount

## Financing Calculation

```
Base Percentage: 70%
Risk Bonus: Up to 10% based on risk score (0-100)
Platform Fee: 1.5% of financed amount

Final Amount = (Invoice Amount * Percentage) - Fee
```

## Security Features

- Replit Auth with OAuth 2.0
- Session-based authentication with secure cookies
- Encrypted secrets management
- Input validation with Zod schemas
- Rate limiting on API endpoints
- Transaction verification on-chain

## Polygon Integration

The platform connects to Polygon mainnet via public RPC endpoints:
- `https://polygon-rpc.com`
- `https://rpc-mainnet.matic.network`
- `https://rpc.ankr.com/polygon`

All transactions are recorded with:
- Transaction hash
- Block number
- Gas used
- Confirmation count

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built for Polygon Buildathon 2024
- Powered by Google Gemini AI
- UI components from shadcn/ui
- Deployed on Replit

---

**InvoiceFin** - Bridging Traditional Finance with DeFi
