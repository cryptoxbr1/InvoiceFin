import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - wallet address is the primary identifier
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address").unique().notNull(),
  email: varchar("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business registration and KYC
export const businesses = pgTable("businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address").notNull(),
  companyName: varchar("company_name").notNull(),
  taxId: varchar("tax_id").notNull(),
  registrationNumber: varchar("registration_number"),
  industry: varchar("industry").notNull(),
  address: text("address").notNull(),
  city: varchar("city").notNull(),
  country: varchar("country").notNull(),
  postalCode: varchar("postal_code"),
  phone: varchar("phone"),
  website: varchar("website"),
  kycStatus: varchar("kyc_status").default("pending"), // pending, verified, rejected
  kycVerifiedAt: timestamp("kyc_verified_at"),
  riskScore: integer("risk_score").default(50), // 0-100
  totalInvoicesFinanced: integer("total_invoices_financed").default(0),
  totalAmountFinanced: decimal("total_amount_financed", { precision: 18, scale: 2 }).default("0"),
  repaymentRate: decimal("repayment_rate", { precision: 5, scale: 2 }).default("100"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoices
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  invoiceNumber: varchar("invoice_number").notNull(),
  buyerName: varchar("buyer_name").notNull(),
  buyerEmail: varchar("buyer_email"),
  buyerAddress: text("buyer_address"),
  buyerWalletAddress: varchar("buyer_wallet_address"),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  description: text("description"),
  status: varchar("status").default("pending"), // pending, verified, financed, repaid, rejected, defaulted
  documentUrl: text("document_url"),
  documentHash: varchar("document_hash"),
  aiVerificationResult: jsonb("ai_verification_result"),
  aiRiskScore: integer("ai_risk_score"),
  fraudDetectionResult: jsonb("fraud_detection_result"),
  financedAmount: decimal("financed_amount", { precision: 18, scale: 2 }),
  financedAt: timestamp("financed_at"),
  repaidAt: timestamp("repaid_at"),
  blockchainTxHash: varchar("blockchain_tx_hash"),
  blockchainInvoiceId: varchar("blockchain_invoice_id"),
  blockchainConfirmations: integer("blockchain_confirmations").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transactions on Polygon
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id),
  businessId: varchar("business_id").references(() => businesses.id),
  walletAddress: varchar("wallet_address"),
  type: varchar("type").notNull(), // finance, repay, withdraw, deposit
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  currency: varchar("currency").default("MATIC"),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }),
  fromAddress: varchar("from_address"),
  toAddress: varchar("to_address"),
  txHash: varchar("tx_hash"),
  blockNumber: integer("block_number"),
  confirmations: integer("confirmations").default(0),
  gasUsed: decimal("gas_used", { precision: 18, scale: 8 }),
  gasPriceGwei: decimal("gas_price_gwei", { precision: 18, scale: 4 }),
  status: varchar("status").default("pending"), // pending, confirmed, failed
  createdAt: timestamp("created_at").defaultNow(),
});

// Liquidity Pool
export const liquidityPool = pgTable("liquidity_pool", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address").notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  currency: varchar("currency").default("MATIC"),
  depositTxHash: varchar("deposit_tx_hash"),
  withdrawTxHash: varchar("withdraw_tx_hash"),
  status: varchar("status").default("active"), // active, withdrawn
  earnedInterest: decimal("earned_interest", { precision: 18, scale: 8 }).default("0"),
  apy: decimal("apy", { precision: 5, scale: 2 }).default("8.5"),
  depositedAt: timestamp("deposited_at").defaultNow(),
  withdrawnAt: timestamp("withdrawn_at"),
});

// Exchange Rates Cache
export const exchangeRates = pgTable("exchange_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  baseCurrency: varchar("base_currency").notNull(),
  quoteCurrency: varchar("quote_currency").notNull(),
  rate: decimal("rate", { precision: 18, scale: 8 }).notNull(),
  source: varchar("source").default("coingecko"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  liquidityDeposits: many(liquidityPool),
}));

export const businessesRelations = relations(businesses, ({ many }) => ({
  invoices: many(invoices),
  transactions: many(transactions),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  business: one(businesses, {
    fields: [invoices.businessId],
    references: [businesses.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  invoice: one(invoices, {
    fields: [transactions.invoiceId],
    references: [invoices.id],
  }),
  business: one(businesses, {
    fields: [transactions.businessId],
    references: [businesses.id],
  }),
}));

export const liquidityPoolRelations = relations(liquidityPool, ({ one }) => ({
  user: one(users, {
    fields: [liquidityPool.walletAddress],
    references: [users.walletAddress],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  kycVerifiedAt: true,
  totalInvoicesFinanced: true,
  totalAmountFinanced: true,
  repaymentRate: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  aiVerificationResult: true,
  aiRiskScore: true,
  fraudDetectionResult: true,
  financedAmount: true,
  financedAt: true,
  repaidAt: true,
  blockchainTxHash: true,
  blockchainInvoiceId: true,
  blockchainConfirmations: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertLiquidityPoolSchema = createInsertSchema(liquidityPool).omit({
  id: true,
  depositedAt: true,
  withdrawnAt: true,
  earnedInterest: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertLiquidityPool = z.infer<typeof insertLiquidityPoolSchema>;
export type LiquidityPool = typeof liquidityPool.$inferSelect;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
