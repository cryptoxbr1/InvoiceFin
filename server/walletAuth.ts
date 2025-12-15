import type { Request, Response, NextFunction, RequestHandler } from "express";
import crypto from "crypto";
import { ethers } from "ethers";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      walletAddress?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const nonceStore = new Map<string, { nonce: string; expires: number }>();
const NONCE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const SESSION_EXPIRY = "24h";

export function generateNonce(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function createNonce(walletAddress: string): string {
  const nonce = generateNonce();
  const normalizedAddress = walletAddress.toLowerCase();
  
  nonceStore.set(normalizedAddress, {
    nonce,
    expires: Date.now() + NONCE_EXPIRY,
  });
  
  return nonce;
}

export function verifyNonce(walletAddress: string, nonce: string): boolean {
  const normalizedAddress = walletAddress.toLowerCase();
  const stored = nonceStore.get(normalizedAddress);
  
  if (!stored) return false;
  if (Date.now() > stored.expires) {
    nonceStore.delete(normalizedAddress);
    return false;
  }
  if (stored.nonce !== nonce) return false;
  
  nonceStore.delete(normalizedAddress);
  return true;
}

export function createSignMessage(walletAddress: string, nonce: string): string {
  return `Welcome to InvoiceFin!

Sign this message to verify your wallet ownership.

Wallet: ${walletAddress}
Nonce: ${nonce}

This signature does not trigger any blockchain transaction or cost any gas fees.`;
}

export function verifySignature(message: string, signature: string, expectedAddress: string): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}

export function createSessionToken(walletAddress: string): string {
  const normalizedAddress = walletAddress.toLowerCase();
  return jwt.sign(
    { walletAddress: normalizedAddress },
    JWT_SECRET,
    { expiresIn: SESSION_EXPIRY }
  );
}

export function verifySessionToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { walletAddress: string };
    return decoded.walletAddress;
  } catch (error) {
    return null;
  }
}

export const requireWallet: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token required" });
  }
  
  const token = authHeader.substring(7);
  const walletAddress = verifySessionToken(token);
  
  if (!walletAddress) {
    return res.status(401).json({ message: "Invalid or expired session. Please sign in again." });
  }
  
  req.walletAddress = walletAddress;
  next();
};

export const optionalWallet: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const walletAddress = verifySessionToken(token);
    if (walletAddress) {
      req.walletAddress = walletAddress;
    }
  }
  
  next();
};

setInterval(() => {
  const now = Date.now();
  for (const [address, data] of nonceStore.entries()) {
    if (now > data.expires) {
      nonceStore.delete(address);
    }
  }
}, 60000);
