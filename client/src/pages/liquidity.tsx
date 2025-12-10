import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Wallet,
  TrendingUp,
  Plus,
  Minus,
  DollarSign,
  PieChart,
  ExternalLink,
  Loader2,
  Info,
} from "lucide-react";
import type { LiquidityPool } from "@shared/schema";

interface LiquidityData {
  deposits: LiquidityPool[];
  totalPool: number;
  apy: number;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Liquidity() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDialog, setDepositDialog] = useState(false);

  const { data, isLoading } = useQuery<LiquidityData>({
    queryKey: ["/api/liquidity"],
  });

  const { data: maticPrice } = useQuery<{ usd: number }>({
    queryKey: ["/api/polygon/price"],
  });

  const depositMutation = useMutation({
    mutationFn: async (amount: string) => {
      const mockTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join("")}`;
      return apiRequest("POST", "/api/liquidity/deposit", { amount, txHash: mockTxHash });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/liquidity"] });
      setDepositDialog(false);
      setDepositAmount("");
      toast({
        title: "Deposit successful",
        description: "Your liquidity has been added to the pool",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deposit failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (depositId: string) => {
      return apiRequest("POST", `/api/liquidity/${depositId}/withdraw`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/liquidity"] });
      toast({
        title: "Withdrawal successful",
        description: "Your funds have been withdrawn",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Withdrawal failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const activeDeposits = data?.deposits.filter((d) => d.status === "active") || [];
  const totalDeposited = activeDeposits.reduce((sum, d) => sum + parseFloat(d.amount), 0);
  const totalEarned = activeDeposits.reduce((sum, d) => sum + parseFloat(d.earnedInterest || "0"), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-liquidity-title">
            Liquidity Pool
          </h1>
          <p className="text-muted-foreground">
            Provide liquidity to earn yield on invoice financing
          </p>
        </div>
        <Dialog open={depositDialog} onOpenChange={setDepositDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-deposit">
              <Plus className="mr-2 h-4 w-4" />
              Add Liquidity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Deposit to Liquidity Pool
              </DialogTitle>
              <DialogDescription>
                Deposit MATIC to provide liquidity for invoice financing and earn yield.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (MATIC)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="100.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  data-testid="input-deposit-amount"
                />
                {depositAmount && maticPrice && (
                  <p className="text-xs text-muted-foreground">
                    ≈ ${(parseFloat(depositAmount) * maticPrice.usd).toFixed(2)} USD
                  </p>
                )}
              </div>
              <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm">
                <Info className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">Current APY: {data?.apy || 8.5}%</p>
                  <p className="text-muted-foreground">
                    Yield is calculated based on pool utilization and paid out proportionally.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDepositDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => depositMutation.mutate(depositAmount)}
                disabled={!depositAmount || depositMutation.isPending}
              >
                {depositMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Depositing...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Deposit
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Pool Size</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold font-mono" data-testid="text-pool-size">
                {(data?.totalPool || 0).toFixed(2)} MATIC
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              ≈ ${((data?.totalPool || 0) * (maticPrice?.usd || 0.85)).toFixed(2)} USD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Your Deposits</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono" data-testid="text-your-deposits">
              {totalDeposited.toFixed(2)} MATIC
            </div>
            <p className="text-xs text-muted-foreground">
              {activeDeposits.length} active deposit{activeDeposits.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Earned Interest</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-green-600" data-testid="text-earned">
              +{totalEarned.toFixed(4)} MATIC
            </div>
            <p className="text-xs text-muted-foreground">
              ≈ ${(totalEarned * (maticPrice?.usd || 0.85)).toFixed(2)} USD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Current APY</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary" data-testid="text-apy">
              {data?.apy || 8.5}%
            </div>
            <p className="text-xs text-muted-foreground">
              Based on pool utilization
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Deposits</CardTitle>
          <CardDescription>
            Manage your liquidity pool deposits
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.deposits && data.deposits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>APY</TableHead>
                  <TableHead>Earned</TableHead>
                  <TableHead>Deposited</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.deposits.map((deposit) => (
                  <TableRow key={deposit.id} data-testid={`row-deposit-${deposit.id}`}>
                    <TableCell className="font-mono font-medium">
                      {parseFloat(deposit.amount).toFixed(4)} {deposit.currency}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{deposit.apy}%</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-green-600">
                      +{parseFloat(deposit.earnedInterest || "0").toFixed(6)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(deposit.depositedAt!)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={deposit.status === "active" ? "default" : "secondary"}>
                        {deposit.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {deposit.depositTxHash && (
                        <a
                          href={`https://polygonscan.com/tx/${deposit.depositTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          View
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {deposit.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => withdrawMutation.mutate(deposit.id)}
                          disabled={withdrawMutation.isPending}
                        >
                          {withdrawMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Minus className="mr-1 h-3 w-3" />
                              Withdraw
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
              <Wallet className="mb-4 h-12 w-12" />
              <p className="mb-2 font-medium">No deposits yet</p>
              <p className="mb-4 text-sm">
                Add liquidity to start earning yield
              </p>
              <Button onClick={() => setDepositDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Make First Deposit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
