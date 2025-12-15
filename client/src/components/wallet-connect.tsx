import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, ExternalLink, Copy, LogOut, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const POLYGON_CHAIN_ID = "0x89"; // 137 in hex

export function WalletConnect() {
  const { walletAddress, setAuth, disconnect } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPolygon, setIsPolygon] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkConnection();
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  const checkConnection = async () => {
    if (window.ethereum && walletAddress) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          checkNetwork();
        }
      } catch (error) {
        console.error("Error checking connection:", error);
      }
    }
  };

  const checkNetwork = async () => {
    if (window.ethereum) {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      setIsPolygon(chainId === POLYGON_CHAIN_ID);
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnect();
    }
  };

  const handleChainChanged = () => {
    checkNetwork();
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast({
        title: "Wallet not found",
        description: "Please install MetaMask or another Web3 wallet",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        const address = accounts[0].toLowerCase();
        
        const nonceResponse = await fetch(`/api/auth/nonce?address=${address}`);
        if (!nonceResponse.ok) {
          throw new Error("Failed to get nonce");
        }
        const { nonce, message } = await nonceResponse.json();
        
        const signature = await window.ethereum.request({
          method: "personal_sign",
          params: [message, address],
        });
        
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address, signature, nonce }),
        });

        if (response.ok) {
          const { token } = await response.json();
          setAuth(address, token);
          await checkNetwork();
          
          toast({
            title: "Wallet Connected",
            description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
          });
        } else {
          const error = await response.json();
          throw new Error(error.message || "Verification failed");
        }
      }
    } catch (error: any) {
      if (error.code === 4001) {
        toast({
          title: "Signature Rejected",
          description: "You need to sign the message to verify your wallet",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect wallet",
          variant: "destructive",
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToPolygon = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: POLYGON_CHAIN_ID }],
      });
      setIsPolygon(true);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: POLYGON_CHAIN_ID,
                chainName: "Polygon Mainnet",
                nativeCurrency: {
                  name: "MATIC",
                  symbol: "MATIC",
                  decimals: 18,
                },
                rpcUrls: ["https://polygon-rpc.com"],
                blockExplorerUrls: ["https://polygonscan.com"],
              },
            ],
          });
          setIsPolygon(true);
        } catch (addError) {
          console.error("Error adding Polygon network:", addError);
        }
      }
    }
  };

  const disconnectWallet = () => {
    disconnect();
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast({
        title: "Address copied",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!walletAddress) {
    return (
      <Button
        onClick={connectWallet}
        disabled={isConnecting}
        data-testid="button-connect-wallet"
      >
        <Wallet className="mr-2 h-4 w-4" />
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" data-testid="button-wallet-menu">
          <div className="flex items-center gap-2">
            {isPolygon ? (
              <Badge variant="default" className="text-xs">
                <CheckCircle className="mr-1 h-3 w-3" />
                Polygon
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                Wrong Network
              </Badge>
            )}
            <span className="font-mono text-sm">{truncateAddress(walletAddress)}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={copyAddress} data-testid="menu-copy-address">
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://polygonscan.com/address/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-view-explorer"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View on PolygonScan
          </a>
        </DropdownMenuItem>
        {!isPolygon && (
          <DropdownMenuItem onClick={switchToPolygon} data-testid="menu-switch-network">
            <Wallet className="mr-2 h-4 w-4" />
            Switch to Polygon
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnectWallet} data-testid="menu-disconnect">
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
