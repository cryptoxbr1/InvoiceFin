import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Fuel, TrendingUp, TrendingDown, Clock } from "lucide-react";

interface NetworkStatus {
  chainId: number;
  chainName: string;
  blockNumber: number;
  gasPriceGwei: number;
  isHealthy: boolean;
  latency: number;
}

interface GasEstimate {
  slow: { gwei: number; time: string };
  standard: { gwei: number; time: string };
  fast: { gwei: number; time: string };
}

interface MaticPrice {
  usd: number;
  change24h: number;
}

export function NetworkStatus() {
  const { data: status, isLoading: statusLoading } = useQuery<NetworkStatus>({
    queryKey: ["/api/polygon/status"],
    refetchInterval: 15000,
  });

  const { data: gas, isLoading: gasLoading } = useQuery<GasEstimate>({
    queryKey: ["/api/polygon/gas"],
    refetchInterval: 30000,
  });

  const { data: price, isLoading: priceLoading } = useQuery<MaticPrice>({
    queryKey: ["/api/polygon/price"],
    refetchInterval: 60000,
  });

  if (statusLoading || gasLoading || priceLoading) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Badge
        variant={status?.isHealthy ? "default" : "destructive"}
        className="gap-1"
        data-testid="badge-network-status"
      >
        <Activity className="h-3 w-3" />
        {status?.isHealthy ? "Polygon Online" : "Network Issues"}
      </Badge>
      
      <Badge variant="outline" className="gap-1 font-mono" data-testid="badge-block">
        Block #{status?.blockNumber?.toLocaleString()}
      </Badge>

      <Badge variant="secondary" className="gap-1" data-testid="badge-gas">
        <Fuel className="h-3 w-3" />
        {gas?.standard.gwei} Gwei
      </Badge>

      <Badge
        variant="outline"
        className="gap-1"
        data-testid="badge-matic-price"
      >
        <span className="font-mono">${price?.usd.toFixed(2)}</span>
        {price && price.change24h !== 0 && (
          <span className={price.change24h > 0 ? "text-green-500" : "text-red-500"}>
            {price.change24h > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
          </span>
        )}
      </Badge>

      <Badge variant="outline" className="gap-1" data-testid="badge-latency">
        <Clock className="h-3 w-3" />
        {status?.latency}ms
      </Badge>
    </div>
  );
}

export function NetworkStatusCard() {
  const { data: status } = useQuery<NetworkStatus>({
    queryKey: ["/api/polygon/status"],
    refetchInterval: 15000,
  });

  const { data: gas } = useQuery<GasEstimate>({
    queryKey: ["/api/polygon/gas"],
    refetchInterval: 30000,
  });

  const { data: price } = useQuery<MaticPrice>({
    queryKey: ["/api/polygon/price"],
    refetchInterval: 60000,
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                status?.isHealthy ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="font-medium">Polygon Network</span>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>Block</span>
              <span className="font-mono">{status?.blockNumber?.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Fuel className="h-4 w-4" />
              <span className="font-mono">{gas?.standard.gwei} Gwei</span>
            </div>
            
            <div className="flex items-center gap-1">
              <span>MATIC</span>
              <span className="font-mono">${price?.usd.toFixed(2)}</span>
              {price && price.change24h !== 0 && (
                <span className={price.change24h > 0 ? "text-green-500" : "text-red-500"}>
                  ({price.change24h > 0 ? "+" : ""}{price.change24h.toFixed(2)}%)
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
