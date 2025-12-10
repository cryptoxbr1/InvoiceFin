# InvoiceFin - AI-Powered Invoice Financing Platform

## Overview

InvoiceFin is a production-ready invoice financing platform built for the Polygon Buildathon. It combines AI-powered invoice verification using Gemini with instant blockchain-based liquidity provision on Polygon POS network.

## Tech Stack

- **Frontend**: React + TypeScript, TanStack Query, Tailwind CSS, shadcn/ui, Wouter routing
- **Backend**: Express.js + TypeScript, Drizzle ORM, PostgreSQL
- **AI**: Gemini AI for invoice analysis, fraud detection, risk scoring
- **Blockchain**: Polygon POS mainnet, MetaMask wallet integration
- **Auth**: Replit Auth with OAuth 2.0

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and API client
│   │   └── pages/          # Route pages
├── server/                 # Express backend
│   ├── db.ts              # Database connection
│   ├── storage.ts         # Data access layer
│   ├── routes.ts          # API endpoints
│   ├── gemini.ts          # Gemini AI integration
│   ├── polygon.ts         # Polygon network integration
│   └── replitAuth.ts      # Authentication
└── shared/                 # Shared types and schemas
    └── schema.ts          # Drizzle schema definitions
```

## Key Features

1. **Business Registration**: KYC verification with company details
2. **Invoice Upload**: AI-powered document analysis and data extraction
3. **Fraud Detection**: Gemini AI identifies suspicious patterns
4. **Risk Scoring**: Dynamic scoring based on invoice quality and history
5. **Instant Financing**: 70-80% advance paid in MATIC on Polygon
6. **Liquidity Pool**: Earn yield by providing MATIC liquidity
7. **Real-time Monitoring**: Network status, gas prices, MATIC price

## Database Schema

- **users**: User accounts from Replit Auth
- **businesses**: Company KYC information
- **invoices**: Invoice records with AI analysis results
- **transactions**: Blockchain transaction history
- **liquidity_pool**: LP deposits and yields
- **exchange_rates**: Currency conversion rates

## API Routes

### Public
- `GET /api/polygon/status` - Network health
- `GET /api/polygon/gas` - Gas estimates
- `GET /api/polygon/price` - MATIC price
- `GET /api/exchange-rates` - All rates

### Authenticated
- `GET /api/business` - User's business
- `POST /api/business` - Register business
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `POST /api/invoices/analyze` - AI analysis
- `POST /api/invoices/:id/verify` - Fraud detection
- `POST /api/invoices/:id/finance` - Get financing
- `GET /api/transactions` - Transaction history
- `GET /api/liquidity` - Pool and deposits
- `POST /api/liquidity/deposit` - Add liquidity

## Environment Variables

Required secrets:
- `GEMINI_API_KEY` - Google Gemini API key
- `SESSION_SECRET` - Express session secret
- `DATABASE_URL` - PostgreSQL connection string

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
```

## Financing Calculation

- Base advance: 70% of invoice value
- Risk bonus: Up to 10% for low-risk invoices
- Platform fee: 1.5% of financed amount
- Risk score: 0-100 (higher is better)

## Workflow

1. User logs in with Replit Auth
2. Registers business with KYC details
3. Uploads invoice (PDF/image)
4. Gemini AI extracts and validates data
5. AI performs fraud detection and risk assessment
6. User connects MetaMask wallet
7. Financing sent as MATIC on Polygon
8. User repays when buyer settles invoice
