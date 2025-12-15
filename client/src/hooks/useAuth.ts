import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStoredWalletAddress, setStoredWalletAddress, getStoredAuthToken, setStoredAuthToken, clearAuthData } from "@/lib/walletStorage";

interface User {
  id: string;
  walletAddress: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  hasBusiness?: boolean;
  business?: any;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [walletAddress, setWalletAddressState] = useState<string | null>(() => {
    return getStoredWalletAddress();
  });
  const [authToken, setAuthTokenState] = useState<string | null>(() => {
    return getStoredAuthToken();
  });

  const setAuth = useCallback((address: string | null, token: string | null) => {
    setWalletAddressState(address);
    setAuthTokenState(token);
    setStoredWalletAddress(address);
    setStoredAuthToken(token);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  }, [queryClient]);

  const { data: user, isLoading, error, refetch } = useQuery<User>({
    queryKey: ["/api/auth/user", walletAddress],
    queryFn: async () => {
      const token = getStoredAuthToken();
      if (!token) {
        throw new Error("No auth token");
      }
      
      const response = await fetch("/api/auth/user", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          clearAuthData();
          setWalletAddressState(null);
          setAuthTokenState(null);
        }
        throw new Error("Failed to fetch user");
      }
      
      return response.json();
    },
    enabled: !!walletAddress && !!authToken,
    retry: false,
    staleTime: 30000,
  });

  const disconnect = useCallback(() => {
    clearAuthData();
    setWalletAddressState(null);
    setAuthTokenState(null);
    queryClient.clear();
  }, [queryClient]);

  return {
    user,
    walletAddress,
    authToken,
    setAuth,
    isLoading: (walletAddress && authToken) ? isLoading : false,
    isAuthenticated: !!walletAddress && !!authToken && !!user,
    error,
    disconnect,
    refetch,
  };
}

export { getStoredWalletAddress, getStoredAuthToken } from "@/lib/walletStorage";
