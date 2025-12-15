const WALLET_ADDRESS_KEY = "invoicefin_wallet_address";
const AUTH_TOKEN_KEY = "invoicefin_auth_token";

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

export function getStoredAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }
  return null;
}

export function setStoredAuthToken(token: string | null): void {
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }
}

export function clearAuthData(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(WALLET_ADDRESS_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}
