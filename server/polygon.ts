// Polygon POS Network Integration
// Using public RPC endpoints and real network data

export interface NetworkStatus {
  chainId: number;
  chainName: string;
  blockNumber: number;
  gasPrice: string;
  gasPriceGwei: number;
  baseFee: string;
  isHealthy: boolean;
  latency: number;
}

export interface GasEstimate {
  slow: { gwei: number; time: string };
  standard: { gwei: number; time: string };
  fast: { gwei: number; time: string };
}

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}

// Polygon Mainnet RPC endpoints
const POLYGON_RPC_URLS = [
  "https://polygon-rpc.com",
  "https://rpc-mainnet.matic.network",
  "https://rpc.ankr.com/polygon",
];

// Polygon Mainnet Chain ID
export const POLYGON_CHAIN_ID = 137;

// PolygonScan API for real data
const POLYGONSCAN_API = "https://api.polygonscan.com/api";

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function getNetworkStatus(): Promise<NetworkStatus> {
  const startTime = Date.now();
  
  try {
    // Try each RPC endpoint
    for (const rpcUrl of POLYGON_RPC_URLS) {
      try {
        const [blockResponse, gasPriceResponse] = await Promise.all([
          fetchWithTimeout(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_blockNumber",
              params: [],
              id: 1,
            }),
          }),
          fetchWithTimeout(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_gasPrice",
              params: [],
              id: 2,
            }),
          }),
        ]);

        const blockData = await blockResponse.json();
        const gasData = await gasPriceResponse.json();
        
        const blockNumber = parseInt(blockData.result, 16);
        const gasPrice = gasData.result;
        const gasPriceGwei = parseInt(gasPrice, 16) / 1e9;

        return {
          chainId: POLYGON_CHAIN_ID,
          chainName: "Polygon Mainnet",
          blockNumber,
          gasPrice,
          gasPriceGwei: Math.round(gasPriceGwei * 100) / 100,
          baseFee: gasPrice,
          isHealthy: true,
          latency: Date.now() - startTime,
        };
      } catch (e) {
        continue;
      }
    }
    
    throw new Error("All RPC endpoints failed");
  } catch (error) {
    console.error("Network status error:", error);
    return {
      chainId: POLYGON_CHAIN_ID,
      chainName: "Polygon Mainnet",
      blockNumber: 0,
      gasPrice: "0",
      gasPriceGwei: 30,
      baseFee: "0",
      isHealthy: false,
      latency: Date.now() - startTime,
    };
  }
}

export async function getGasEstimates(): Promise<GasEstimate> {
  try {
    const status = await getNetworkStatus();
    const baseGwei = status.gasPriceGwei;
    
    return {
      slow: { gwei: Math.round(baseGwei * 0.8), time: "~5 min" },
      standard: { gwei: Math.round(baseGwei), time: "~30 sec" },
      fast: { gwei: Math.round(baseGwei * 1.5), time: "~15 sec" },
    };
  } catch (error) {
    return {
      slow: { gwei: 25, time: "~5 min" },
      standard: { gwei: 30, time: "~30 sec" },
      fast: { gwei: 50, time: "~15 sec" },
    };
  }
}

export async function getTransactionStatus(txHash: string): Promise<{
  status: "pending" | "confirmed" | "failed";
  confirmations: number;
  blockNumber?: number;
}> {
  try {
    for (const rpcUrl of POLYGON_RPC_URLS) {
      try {
        const response = await fetchWithTimeout(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getTransactionReceipt",
            params: [txHash],
            id: 1,
          }),
        });

        const data = await response.json();
        
        if (!data.result) {
          return { status: "pending", confirmations: 0 };
        }

        const receipt = data.result;
        const txBlockNumber = parseInt(receipt.blockNumber, 16);
        
        // Get current block for confirmations
        const status = await getNetworkStatus();
        const confirmations = status.blockNumber - txBlockNumber;

        return {
          status: receipt.status === "0x1" ? "confirmed" : "failed",
          confirmations: Math.max(0, confirmations),
          blockNumber: txBlockNumber,
        };
      } catch (e) {
        continue;
      }
    }
    
    return { status: "pending", confirmations: 0 };
  } catch (error) {
    console.error("Transaction status error:", error);
    return { status: "pending", confirmations: 0 };
  }
}

export async function getMaticPrice(): Promise<{ usd: number; change24h: number }> {
  try {
    const response = await fetchWithTimeout(
      "https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd&include_24hr_change=true"
    );
    const data = await response.json();
    
    return {
      usd: data["matic-network"]?.usd || 0.85,
      change24h: data["matic-network"]?.usd_24h_change || 0,
    };
  } catch (error) {
    console.error("MATIC price fetch error:", error);
    return { usd: 0.85, change24h: 0 };
  }
}

export async function getExchangeRates(): Promise<Record<string, number>> {
  try {
    const response = await fetchWithTimeout(
      "https://api.coingecko.com/api/v3/simple/price?ids=matic-network,ethereum,bitcoin,usd-coin,tether&vs_currencies=usd"
    );
    const data = await response.json();
    
    return {
      MATIC: data["matic-network"]?.usd || 0.85,
      ETH: data["ethereum"]?.usd || 2300,
      BTC: data["bitcoin"]?.usd || 43000,
      USDC: data["usd-coin"]?.usd || 1,
      USDT: data["tether"]?.usd || 1,
      USD: 1,
    };
  } catch (error) {
    console.error("Exchange rates fetch error:", error);
    return {
      MATIC: 0.85,
      ETH: 2300,
      BTC: 43000,
      USDC: 1,
      USDT: 1,
      USD: 1,
    };
  }
}

export function getPolygonScanUrl(txHash: string): string {
  return `https://polygonscan.com/tx/${txHash}`;
}

export function getPolygonScanAddressUrl(address: string): string {
  return `https://polygonscan.com/address/${address}`;
}

// Calculate financing amount (70-80% of invoice value)
export function calculateFinancingAmount(invoiceAmount: number, riskScore: number): {
  amount: number;
  percentage: number;
  fee: number;
} {
  // Higher risk score = lower financing percentage
  // Risk score 0-100, higher is better
  const basePercentage = 0.70; // 70% minimum
  const maxBonus = 0.10; // up to 10% more for low-risk invoices
  const riskBonus = (riskScore / 100) * maxBonus;
  const percentage = basePercentage + riskBonus;
  
  const amount = invoiceAmount * percentage;
  const fee = amount * 0.015; // 1.5% financing fee
  
  return {
    amount: Math.round((amount - fee) * 100) / 100,
    percentage: Math.round(percentage * 100),
    fee: Math.round(fee * 100) / 100,
  };
}

// Calculate APY for liquidity providers
export function calculateAPY(
  totalPoolSize: number,
  totalLoansActive: number,
  averageLoanDuration: number
): number {
  if (totalPoolSize === 0) return 8.5; // Default APY
  
  const utilizationRate = totalLoansActive / totalPoolSize;
  const baseAPY = 5; // 5% base
  const utilizationBonus = utilizationRate * 10; // up to 10% bonus
  
  return Math.min(20, Math.round((baseAPY + utilizationBonus) * 100) / 100);
}
