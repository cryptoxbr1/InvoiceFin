import type { Request, Response, NextFunction, RequestHandler } from "express";
import crypto from "crypto";

declare global {
  namespace Express {
    interface Request {
      walletAddress?: string;
    }
  }
}

const nonceStore = new Map<string, { nonce: string; expires: number }>();
const NONCE_EXPIRY = 5 * 60 * 1000; // 5 minutes

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
Timestamp: ${new Date().toISOString()}

This signature does not trigger any blockchain transaction or cost any gas fees.`;
}

function recoverAddress(message: string, signature: string): string | null {
  try {
    const msgBuffer = Buffer.from(message);
    const msgHash = Buffer.from(
      `\x19Ethereum Signed Message:\n${msgBuffer.length}${message}`
    );
    
    const hashBuffer = crypto.createHash("keccak256").update(msgHash).digest();
    
    const sigBuffer = Buffer.from(signature.slice(2), "hex");
    if (sigBuffer.length !== 65) return null;
    
    const r = sigBuffer.slice(0, 32);
    const s = sigBuffer.slice(32, 64);
    let v = sigBuffer[64];
    
    if (v < 27) v += 27;
    
    return null;
  } catch {
    return null;
  }
}

export const requireWallet: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const walletAddress = req.headers["x-wallet-address"] as string;
  
  if (!walletAddress) {
    return res.status(401).json({ message: "Wallet address required" });
  }
  
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({ message: "Invalid wallet address format" });
  }
  
  req.walletAddress = walletAddress.toLowerCase();
  next();
};

export const optionalWallet: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const walletAddress = req.headers["x-wallet-address"] as string;
  
  if (walletAddress && /^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    req.walletAddress = walletAddress.toLowerCase();
  }
  
  next();
};

setInterval(() => {
  const now = Date.now();
  const entries = Array.from(nonceStore.entries());
  for (const [address, data] of entries) {
    if (now > data.expires) {
      nonceStore.delete(address);
    }
  }
}, 60000);
