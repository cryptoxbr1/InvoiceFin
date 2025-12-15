const WALLET_ADDRESS_KEY = "invoicefin_wallet_address";

export function getStoredWalletAddress(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(WALLET_ADDRESS_KEY);
  }
  return null;
}

export function setStoredWalletAddress(address: string | null): void {
  if (typeof window !== "undefined") {
    if (address) {
      localStorage.setItem(WALLET_ADDRESS_KEY, address);
    } else {
      localStorage.removeItem(WALLET_ADDRESS_KEY);
    }
  }
}
