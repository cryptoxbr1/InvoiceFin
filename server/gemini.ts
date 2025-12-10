import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface InvoiceAnalysisResult {
  isValid: boolean;
  confidence: number;
  extractedData: {
    invoiceNumber?: string;
    amount?: number;
    currency?: string;
    issueDate?: string;
    dueDate?: string;
    buyerName?: string;
    buyerAddress?: string;
    sellerName?: string;
    description?: string;
  };
  issues: string[];
  suggestions: string[];
}

export interface FraudDetectionResult {
  isSuspicious: boolean;
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  flags: string[];
  analysis: string;
}

export interface RiskAssessmentResult {
  overallScore: number;
  factors: {
    invoiceQuality: number;
    buyerReliability: number;
    paymentHistory: number;
    industryRisk: number;
    amountRisk: number;
  };
  recommendation: "approve" | "review" | "reject";
  reasoning: string;
}

export async function analyzeInvoiceImage(
  imageBase64: string,
  mimeType: string
): Promise<InvoiceAnalysisResult> {
  try {
    const systemPrompt = `You are an expert invoice analyzer. Analyze the provided invoice image and extract all relevant information.
Return a JSON response with the following structure:
{
  "isValid": boolean,
  "confidence": number (0-1),
  "extractedData": {
    "invoiceNumber": string or null,
    "amount": number or null,
    "currency": string or null,
    "issueDate": string (ISO format) or null,
    "dueDate": string (ISO format) or null,
    "buyerName": string or null,
    "buyerAddress": string or null,
    "sellerName": string or null,
    "description": string or null
  },
  "issues": array of strings describing any problems found,
  "suggestions": array of strings with improvement suggestions
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
      contents: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        },
        "Analyze this invoice document thoroughly.",
      ],
    });

    const rawJson = response.text;
    if (rawJson) {
      return JSON.parse(rawJson);
    }
    throw new Error("Empty response from Gemini");
  } catch (error) {
    console.error("Invoice analysis error:", error);
    return {
      isValid: false,
      confidence: 0,
      extractedData: {},
      issues: ["Failed to analyze invoice"],
      suggestions: ["Please upload a clearer image"],
    };
  }
}

export async function detectFraud(
  invoiceData: any,
  businessHistory: any
): Promise<FraudDetectionResult> {
  try {
    const systemPrompt = `You are a fraud detection expert for invoice financing. Analyze the invoice data and business history to detect potential fraud.

Consider these fraud indicators:
- Unusually high invoice amounts
- Mismatched buyer/seller information
- Suspicious patterns in invoice timing
- Inconsistent formatting or data
- New businesses with large invoices
- Multiple invoices to the same buyer in short periods

Return a JSON response:
{
  "isSuspicious": boolean,
  "riskLevel": "low" | "medium" | "high",
  "riskScore": number (0-100, higher = more risky),
  "flags": array of specific concerns,
  "analysis": string explaining your assessment
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
      contents: `Invoice Data: ${JSON.stringify(invoiceData)}
Business History: ${JSON.stringify(businessHistory)}`,
    });

    const rawJson = response.text;
    if (rawJson) {
      return JSON.parse(rawJson);
    }
    throw new Error("Empty response from Gemini");
  } catch (error) {
    console.error("Fraud detection error:", error);
    return {
      isSuspicious: false,
      riskLevel: "medium",
      riskScore: 50,
      flags: ["Unable to complete fraud analysis"],
      analysis: "Fraud detection system encountered an error. Manual review recommended.",
    };
  }
}

export async function assessRisk(
  invoiceData: any,
  businessData: any,
  marketData: any
): Promise<RiskAssessmentResult> {
  try {
    const systemPrompt = `You are a credit risk analyst for invoice financing. Assess the risk of financing this invoice.

Consider:
- Invoice quality and legitimacy
- Buyer's perceived reliability
- Business's payment history and track record
- Industry-specific risks
- Invoice amount relative to business size

Return a JSON response:
{
  "overallScore": number (0-100, higher = lower risk/better),
  "factors": {
    "invoiceQuality": number (0-100),
    "buyerReliability": number (0-100),
    "paymentHistory": number (0-100),
    "industryRisk": number (0-100),
    "amountRisk": number (0-100)
  },
  "recommendation": "approve" | "review" | "reject",
  "reasoning": string explaining the assessment
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
      contents: `Invoice: ${JSON.stringify(invoiceData)}
Business: ${JSON.stringify(businessData)}
Market Context: ${JSON.stringify(marketData)}`,
    });

    const rawJson = response.text;
    if (rawJson) {
      return JSON.parse(rawJson);
    }
    throw new Error("Empty response from Gemini");
  } catch (error) {
    console.error("Risk assessment error:", error);
    return {
      overallScore: 50,
      factors: {
        invoiceQuality: 50,
        buyerReliability: 50,
        paymentHistory: 50,
        industryRisk: 50,
        amountRisk: 50,
      },
      recommendation: "review",
      reasoning: "Risk assessment system encountered an error. Manual review required.",
    };
  }
}

export async function analyzeInvoiceText(invoiceText: string): Promise<InvoiceAnalysisResult> {
  try {
    const systemPrompt = `You are an expert invoice analyzer. Parse the provided invoice text and extract all relevant information.
Return a JSON response with the following structure:
{
  "isValid": boolean,
  "confidence": number (0-1),
  "extractedData": {
    "invoiceNumber": string or null,
    "amount": number or null,
    "currency": string or null,
    "issueDate": string (ISO format) or null,
    "dueDate": string (ISO format) or null,
    "buyerName": string or null,
    "buyerAddress": string or null,
    "sellerName": string or null,
    "description": string or null
  },
  "issues": array of strings describing any problems found,
  "suggestions": array of strings with improvement suggestions
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
      contents: invoiceText,
    });

    const rawJson = response.text;
    if (rawJson) {
      return JSON.parse(rawJson);
    }
    throw new Error("Empty response from Gemini");
  } catch (error) {
    console.error("Invoice text analysis error:", error);
    return {
      isValid: false,
      confidence: 0,
      extractedData: {},
      issues: ["Failed to analyze invoice text"],
      suggestions: ["Please provide clearer invoice information"],
    };
  }
}
