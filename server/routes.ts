import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { requireWallet, createNonce, createSignMessage, verifySignature, verifyNonce, createSessionToken } from "./walletAuth";
import { analyzeInvoiceImage, analyzeInvoiceText, detectFraud, assessRisk } from "./gemini";
import { 
  getNetworkStatus, 
  getGasEstimates, 
  getTransactionStatus, 
  getMaticPrice, 
  getExchangeRates,
  calculateFinancingAmount,
  calculateAPY,
  getPolygonScanUrl 
} from "./polygon";
import { insertBusinessSchema, insertInvoiceSchema } from "@shared/schema";
import multer from "multer";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  // Auth routes - wallet based
  app.get("/api/auth/nonce", async (req, res) => {
    try {
      const walletAddress = req.query.address as string;
      
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return res.status(400).json({ message: "Valid wallet address required" });
      }
      
      const nonce = createNonce(walletAddress);
      const message = createSignMessage(walletAddress, nonce);
      
      res.json({ nonce, message });
    } catch (error) {
      console.error("Error generating nonce:", error);
      res.status(500).json({ message: "Failed to generate nonce" });
    }
  });

  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { walletAddress, signature, nonce } = req.body;
      
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return res.status(400).json({ message: "Valid wallet address required" });
      }
      
      if (!signature || !nonce) {
        return res.status(400).json({ message: "Signature and nonce required" });
      }
      
      if (!verifyNonce(walletAddress, nonce)) {
        return res.status(400).json({ message: "Invalid or expired nonce" });
      }
      
      const message = createSignMessage(walletAddress, nonce);
      if (!verifySignature(message, signature, walletAddress)) {
        return res.status(401).json({ message: "Invalid signature" });
      }
      
      const token = createSessionToken(walletAddress);
      
      const user = await storage.getOrCreateUser(walletAddress);
      
      res.json({ 
        authenticated: true,
        token,
        user 
      });
    } catch (error) {
      console.error("Error verifying wallet:", error);
      res.status(500).json({ message: "Failed to verify wallet" });
    }
  });

  app.get("/api/auth/user", requireWallet, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const user = await storage.getOrCreateUser(walletAddress);
      const business = await storage.getBusinessByWallet(walletAddress);
      
      res.json({
        ...user,
        hasBusiness: !!business,
        business: business || null,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Business routes
  app.get("/api/business", requireWallet, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const business = await storage.getBusinessByWallet(walletAddress);
      res.json(business || null);
    } catch (error) {
      console.error("Error fetching business:", error);
      res.status(500).json({ message: "Failed to fetch business" });
    }
  });

  app.post("/api/business", requireWallet, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const existingBusiness = await storage.getBusinessByWallet(walletAddress);
      
      if (existingBusiness) {
        return res.status(400).json({ message: "Business already exists" });
      }

      const validatedData = insertBusinessSchema.parse({
        ...req.body,
        walletAddress,
      });

      const business = await storage.createBusiness(validatedData);
      res.json(business);
    } catch (error) {
      console.error("Error creating business:", error);
      res.status(500).json({ message: "Failed to create business" });
    }
  });

  app.patch("/api/business/:id", requireWallet, async (req, res) => {
    try {
      const { id } = req.params;
      const walletAddress = req.walletAddress!;
      
      // Verify ownership
      const business = await storage.getBusiness(id);
      if (!business || business.walletAddress.toLowerCase() !== walletAddress) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const updatedBusiness = await storage.updateBusiness(id, req.body);
      res.json(updatedBusiness);
    } catch (error) {
      console.error("Error updating business:", error);
      res.status(500).json({ message: "Failed to update business" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", requireWallet, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const business = await storage.getBusinessByWallet(walletAddress);
      
      if (!business) {
        return res.json([]);
      }

      const invoices = await storage.getInvoicesByBusiness(business.id);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", requireWallet, async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.getInvoice(id);
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", requireWallet, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const business = await storage.getBusinessByWallet(walletAddress);
      
      if (!business) {
        return res.status(400).json({ message: "Business not registered" });
      }

      const validatedData = insertInvoiceSchema.parse({
        ...req.body,
        businessId: business.id,
      });

      const invoice = await storage.createInvoice(validatedData);
      res.json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // Invoice AI analysis
  app.post("/api/invoices/analyze", requireWallet, upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const base64 = req.file.buffer.toString("base64");
      const mimeType = req.file.mimetype;

      const analysis = await analyzeInvoiceImage(base64, mimeType);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing invoice:", error);
      res.status(500).json({ message: "Failed to analyze invoice" });
    }
  });

  app.post("/api/invoices/analyze-text", requireWallet, async (req, res) => {
    try {
      const { text } = req.body;
      const analysis = await analyzeInvoiceText(text);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing invoice text:", error);
      res.status(500).json({ message: "Failed to analyze invoice text" });
    }
  });

  // Fraud detection and risk assessment
  app.post("/api/invoices/:id/verify", requireWallet, async (req, res) => {
    try {
      const { id } = req.params;
      const walletAddress = req.walletAddress!;
      const business = await storage.getBusinessByWallet(walletAddress);
      const invoice = await storage.getInvoice(id);

      if (!invoice || !business) {
        return res.status(404).json({ message: "Invoice or business not found" });
      }

      // Verify ownership
      if (invoice.businessId !== business.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Run fraud detection
      const fraudResult = await detectFraud(invoice, {
        totalInvoices: business.totalInvoicesFinanced,
        repaymentRate: business.repaymentRate,
        riskScore: business.riskScore,
      });

      // Run risk assessment
      const riskResult = await assessRisk(
        invoice,
        business,
        { currentMarketConditions: "stable" }
      );

      // Update invoice with results
      const updatedInvoice = await storage.updateInvoice(id, {
        fraudDetectionResult: fraudResult,
        aiRiskScore: riskResult.overallScore,
        aiVerificationResult: riskResult,
        status: riskResult.recommendation === "reject" ? "rejected" : "verified",
      });

      res.json({
        invoice: updatedInvoice,
        fraudDetection: fraudResult,
        riskAssessment: riskResult,
      });
    } catch (error) {
      console.error("Error verifying invoice:", error);
      res.status(500).json({ message: "Failed to verify invoice" });
    }
  });

  // Finance an invoice
  app.post("/api/invoices/:id/finance", requireWallet, async (req, res) => {
    try {
      const { id } = req.params;
      const { txHash } = req.body;
      const walletAddress = req.walletAddress!;
      const business = await storage.getBusinessByWallet(walletAddress);
      const invoice = await storage.getInvoice(id);

      if (!invoice || !business) {
        return res.status(404).json({ message: "Invoice or business not found" });
      }

      // Verify ownership
      if (invoice.businessId !== business.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (invoice.status !== "verified") {
        return res.status(400).json({ message: "Invoice must be verified first" });
      }

      const riskScore = invoice.aiRiskScore || 50;
      const invoiceAmount = parseFloat(invoice.amount);
      const financing = calculateFinancingAmount(invoiceAmount, riskScore);

      // Create transaction record
      const transaction = await storage.createTransaction({
        invoiceId: id,
        businessId: business.id,
        walletAddress,
        type: "finance",
        amount: financing.amount.toString(),
        currency: "MATIC",
        txHash,
        status: "pending",
      });

      // Update invoice
      const updatedInvoice = await storage.updateInvoice(id, {
        status: "financed",
        financedAmount: financing.amount.toString(),
        financedAt: new Date(),
        blockchainTxHash: txHash,
      });

      // Update business stats
      await storage.updateBusiness(business.id, {
        totalInvoicesFinanced: (business.totalInvoicesFinanced || 0) + 1,
        totalAmountFinanced: (parseFloat(business.totalAmountFinanced || "0") + financing.amount).toString(),
      });

      res.json({
        invoice: updatedInvoice,
        transaction,
        financing,
        explorerUrl: getPolygonScanUrl(txHash),
      });
    } catch (error) {
      console.error("Error financing invoice:", error);
      res.status(500).json({ message: "Failed to finance invoice" });
    }
  });

  // Mark invoice as repaid
  app.post("/api/invoices/:id/repay", requireWallet, async (req, res) => {
    try {
      const { id } = req.params;
      const { txHash } = req.body;
      const walletAddress = req.walletAddress!;
      const business = await storage.getBusinessByWallet(walletAddress);
      const invoice = await storage.getInvoice(id);

      if (!invoice || !business) {
        return res.status(404).json({ message: "Invoice or business not found" });
      }

      // Create repayment transaction
      const transaction = await storage.createTransaction({
        invoiceId: id,
        businessId: business.id,
        walletAddress,
        type: "repay",
        amount: invoice.amount,
        currency: invoice.currency || "USD",
        txHash,
        status: "pending",
      });

      // Update invoice
      const updatedInvoice = await storage.updateInvoice(id, {
        status: "repaid",
        repaidAt: new Date(),
      });

      res.json({
        invoice: updatedInvoice,
        transaction,
        explorerUrl: txHash ? getPolygonScanUrl(txHash) : null,
      });
    } catch (error) {
      console.error("Error repaying invoice:", error);
      res.status(500).json({ message: "Failed to repay invoice" });
    }
  });

  // Transaction routes
  app.get("/api/transactions", requireWallet, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const business = await storage.getBusinessByWallet(walletAddress);
      
      if (!business) {
        return res.json([]);
      }

      const transactions = await storage.getTransactionsByBusiness(business.id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/:txHash/status", requireWallet, async (req, res) => {
    try {
      const { txHash } = req.params;
      const status = await getTransactionStatus(txHash);
      res.json(status);
    } catch (error) {
      console.error("Error fetching transaction status:", error);
      res.status(500).json({ message: "Failed to fetch transaction status" });
    }
  });

  // Liquidity Pool routes
  app.get("/api/liquidity", requireWallet, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const deposits = await storage.getLiquidityByWallet(walletAddress);
      const totalPool = await storage.getTotalPoolSize();
      const apy = calculateAPY(totalPool, totalPool * 0.7, 30);
      
      res.json({
        deposits,
        totalPool,
        apy,
      });
    } catch (error) {
      console.error("Error fetching liquidity:", error);
      res.status(500).json({ message: "Failed to fetch liquidity" });
    }
  });

  app.post("/api/liquidity/deposit", requireWallet, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const { amount, txHash } = req.body;

      const totalPool = await storage.getTotalPoolSize();
      const apy = calculateAPY(totalPool + parseFloat(amount), (totalPool + parseFloat(amount)) * 0.7, 30);

      const deposit = await storage.createLiquidityDeposit({
        walletAddress,
        amount,
        currency: "MATIC",
        depositTxHash: txHash,
        status: "active",
        apy: apy.toString(),
      });

      res.json(deposit);
    } catch (error) {
      console.error("Error depositing liquidity:", error);
      res.status(500).json({ message: "Failed to deposit liquidity" });
    }
  });

  app.post("/api/liquidity/:id/withdraw", requireWallet, async (req, res) => {
    try {
      const { id } = req.params;
      const deposit = await storage.withdrawLiquidity(id);
      res.json(deposit);
    } catch (error) {
      console.error("Error withdrawing liquidity:", error);
      res.status(500).json({ message: "Failed to withdraw liquidity" });
    }
  });

  // Polygon network routes (public)
  app.get("/api/polygon/status", async (req, res) => {
    try {
      const status = await getNetworkStatus();
      res.json(status);
    } catch (error) {
      console.error("Error fetching network status:", error);
      res.status(500).json({ message: "Failed to fetch network status" });
    }
  });

  app.get("/api/polygon/gas", async (req, res) => {
    try {
      const estimates = await getGasEstimates();
      res.json(estimates);
    } catch (error) {
      console.error("Error fetching gas estimates:", error);
      res.status(500).json({ message: "Failed to fetch gas estimates" });
    }
  });

  app.get("/api/polygon/price", async (req, res) => {
    try {
      const price = await getMaticPrice();
      res.json(price);
    } catch (error) {
      console.error("Error fetching MATIC price:", error);
      res.status(500).json({ message: "Failed to fetch MATIC price" });
    }
  });

  app.get("/api/exchange-rates", async (req, res) => {
    try {
      const rates = await getExchangeRates();
      res.json(rates);
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
      res.status(500).json({ message: "Failed to fetch exchange rates" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", requireWallet, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const business = await storage.getBusinessByWallet(walletAddress);
      
      if (!business) {
        return res.json({
          totalInvoices: 0,
          pendingInvoices: 0,
          financedInvoices: 0,
          totalFinanced: 0,
          totalRepaid: 0,
        });
      }

      const stats = await storage.getDashboardStats(business.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Financing calculation
  app.post("/api/calculate-financing", requireWallet, async (req, res) => {
    try {
      const { amount, riskScore } = req.body;
      const financing = calculateFinancingAmount(amount, riskScore || 50);
      res.json(financing);
    } catch (error) {
      console.error("Error calculating financing:", error);
      res.status(500).json({ message: "Failed to calculate financing" });
    }
  });

  // Pool stats (public)
  app.get("/api/pool/stats", async (req, res) => {
    try {
      const totalPool = await storage.getTotalPoolSize();
      const apy = calculateAPY(totalPool, totalPool * 0.7, 30);
      
      res.json({
        totalPool,
        apy,
        utilizationRate: 0.7,
      });
    } catch (error) {
      console.error("Error fetching pool stats:", error);
      res.status(500).json({ message: "Failed to fetch pool stats" });
    }
  });
}
