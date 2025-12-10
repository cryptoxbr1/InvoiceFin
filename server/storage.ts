import {
  users,
  businesses,
  invoices,
  transactions,
  liquidityPool,
  exchangeRates,
  type User,
  type UpsertUser,
  type Business,
  type InsertBusiness,
  type Invoice,
  type InsertInvoice,
  type Transaction,
  type InsertTransaction,
  type LiquidityPool,
  type InsertLiquidityPool,
  type ExchangeRate,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserWallet(userId: string, walletAddress: string): Promise<User | undefined>;
  
  // Business operations
  getBusiness(id: string): Promise<Business | undefined>;
  getBusinessByUserId(userId: string): Promise<Business | undefined>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: string, data: Partial<Business>): Promise<Business | undefined>;
  updateBusinessKycStatus(id: string, status: string): Promise<Business | undefined>;
  
  // Invoice operations
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoicesByBusiness(businessId: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | undefined>;
  
  // Transaction operations
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionsByBusiness(businessId: string): Promise<Transaction[]>;
  getTransactionsByInvoice(invoiceId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction | undefined>;
  
  // Liquidity Pool operations
  getLiquidityByUser(userId: string): Promise<LiquidityPool[]>;
  getTotalPoolSize(): Promise<number>;
  createLiquidityDeposit(deposit: InsertLiquidityPool): Promise<LiquidityPool>;
  withdrawLiquidity(id: string): Promise<LiquidityPool | undefined>;
  
  // Exchange rates
  getExchangeRate(base: string, quote: string): Promise<ExchangeRate | undefined>;
  upsertExchangeRate(base: string, quote: string, rate: number): Promise<ExchangeRate>;
  
  // Dashboard stats
  getDashboardStats(businessId: string): Promise<{
    totalInvoices: number;
    pendingInvoices: number;
    financedInvoices: number;
    totalFinanced: number;
    totalRepaid: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserWallet(userId: string, walletAddress: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ walletAddress, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Business operations
  async getBusiness(id: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, id));
    return business;
  }

  async getBusinessByUserId(userId: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.userId, userId));
    return business;
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    const [newBusiness] = await db.insert(businesses).values(business).returning();
    return newBusiness;
  }

  async updateBusiness(id: string, data: Partial<Business>): Promise<Business | undefined> {
    const [business] = await db
      .update(businesses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(businesses.id, id))
      .returning();
    return business;
  }

  async updateBusinessKycStatus(id: string, status: string): Promise<Business | undefined> {
    const [business] = await db
      .update(businesses)
      .set({ 
        kycStatus: status, 
        kycVerifiedAt: status === "verified" ? new Date() : null,
        updatedAt: new Date() 
      })
      .where(eq(businesses.id, id))
      .returning();
    return business;
  }

  // Invoice operations
  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async getInvoicesByBusiness(businessId: string): Promise<Invoice[]> {
    return db
      .select()
      .from(invoices)
      .where(eq(invoices.businessId, businessId))
      .orderBy(desc(invoices.createdAt));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | undefined> {
    const [invoice] = await db
      .update(invoices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return invoice;
  }

  // Transaction operations
  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction;
  }

  async getTransactionsByBusiness(businessId: string): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.businessId, businessId))
      .orderBy(desc(transactions.createdAt));
  }

  async getTransactionsByInvoice(invoiceId: string): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.invoiceId, invoiceId))
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction | undefined> {
    const [transaction] = await db
      .update(transactions)
      .set(data)
      .where(eq(transactions.id, id))
      .returning();
    return transaction;
  }

  // Liquidity Pool operations
  async getLiquidityByUser(userId: string): Promise<LiquidityPool[]> {
    return db
      .select()
      .from(liquidityPool)
      .where(eq(liquidityPool.userId, userId))
      .orderBy(desc(liquidityPool.depositedAt));
  }

  async getTotalPoolSize(): Promise<number> {
    const result = await db
      .select({ total: sql<string>`COALESCE(SUM(${liquidityPool.amount}::numeric), 0)` })
      .from(liquidityPool)
      .where(eq(liquidityPool.status, "active"));
    return parseFloat(result[0]?.total || "0");
  }

  async createLiquidityDeposit(deposit: InsertLiquidityPool): Promise<LiquidityPool> {
    const [newDeposit] = await db.insert(liquidityPool).values(deposit).returning();
    return newDeposit;
  }

  async withdrawLiquidity(id: string): Promise<LiquidityPool | undefined> {
    const [deposit] = await db
      .update(liquidityPool)
      .set({ status: "withdrawn", withdrawnAt: new Date() })
      .where(eq(liquidityPool.id, id))
      .returning();
    return deposit;
  }

  // Exchange rates
  async getExchangeRate(base: string, quote: string): Promise<ExchangeRate | undefined> {
    const [rate] = await db
      .select()
      .from(exchangeRates)
      .where(and(eq(exchangeRates.baseCurrency, base), eq(exchangeRates.quoteCurrency, quote)));
    return rate;
  }

  async upsertExchangeRate(base: string, quote: string, rate: number): Promise<ExchangeRate> {
    const existing = await this.getExchangeRate(base, quote);
    
    if (existing) {
      const [updated] = await db
        .update(exchangeRates)
        .set({ rate: rate.toString(), updatedAt: new Date() })
        .where(eq(exchangeRates.id, existing.id))
        .returning();
      return updated;
    }
    
    const [newRate] = await db
      .insert(exchangeRates)
      .values({ baseCurrency: base, quoteCurrency: quote, rate: rate.toString() })
      .returning();
    return newRate;
  }

  // Dashboard stats
  async getDashboardStats(businessId: string): Promise<{
    totalInvoices: number;
    pendingInvoices: number;
    financedInvoices: number;
    totalFinanced: number;
    totalRepaid: number;
  }> {
    const allInvoices = await this.getInvoicesByBusiness(businessId);
    
    const pending = allInvoices.filter(i => i.status === "pending" || i.status === "verified");
    const financed = allInvoices.filter(i => i.status === "financed");
    const repaid = allInvoices.filter(i => i.status === "repaid");
    
    const totalFinanced = financed.reduce((sum, i) => sum + parseFloat(i.financedAmount || "0"), 0);
    const totalRepaid = repaid.reduce((sum, i) => sum + parseFloat(i.amount || "0"), 0);
    
    return {
      totalInvoices: allInvoices.length,
      pendingInvoices: pending.length,
      financedInvoices: financed.length,
      totalFinanced,
      totalRepaid,
    };
  }
}

export const storage = new DatabaseStorage();
