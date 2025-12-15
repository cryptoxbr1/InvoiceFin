import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStoredWalletAddress, setStoredWalletAddress } from "@/lib/walletStorage";

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

  const setWalletAddress = useCallback((address: string | null) => {
    setWalletAddressState(address);
    setStoredWalletAddress(address);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  }, [queryClient]);

  const { data: user, isLoading, error, refetch } = useQuery<User>({
    queryKey: ["/api/auth/user", walletAddress],
    queryFn: async () => {
      if (!walletAddress) {
        throw new Error("No wallet connected");
      }
      
      const response = await fetch("/api/auth/user", {
        headers: {
          "x-wallet-address": walletAddress,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }
      
      return response.json();
    },
    enabled: !!walletAddress,
    retry: false,
    staleTime: 30000,
  });

  const disconnect = useCallback(() => {
    setWalletAddress(null);
    queryClient.clear();
  }, [setWalletAddress, queryClient]);

  return {
    user,
    walletAddress,
    setWalletAddress,
    isLoading: walletAddress ? isLoading : false,
    isAuthenticated: !!walletAddress && !!user,
    error,
    disconnect,
    refetch,
  };
}

export { getStoredWalletAddress } from "@/lib/walletStorage";
