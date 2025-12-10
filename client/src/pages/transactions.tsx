import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import type { Transaction } from "@shared/schema";

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status: string) {
  if (status === "confirmed") {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle className="mr-1 h-3 w-3" />
        Confirmed
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        Failed
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <Clock className="mr-1 h-3 w-3" />
      Pending
    </Badge>
  );
}

function getTypeIcon(type: string) {
  switch (type) {
    case "finance":
      return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    case "repay":
      return <ArrowUpRight className="h-4 w-4 text-blue-500" />;
    case "deposit":
      return <ArrowDownLeft className="h-4 w-4 text-purple-500" />;
    case "withdraw":
      return <ArrowUpRight className="h-4 w-4 text-orange-500" />;
    default:
      return <RefreshCw className="h-4 w-4" />;
  }
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export default function Transactions() {
  const { data: transactions, isLoading, refetch } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-transactions-title">
            Transactions
          </h1>
          <p className="text-muted-foreground">
            All blockchain transactions on Polygon
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {transactions?.length || 0} transactions found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Transaction Hash</TableHead>
                  <TableHead>Confirmations</TableHead>
                  <TableHead>Gas Used</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} data-testid={`row-tx-${tx.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(tx.type)}
                        <span className="capitalize font-medium">{tx.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {parseFloat(tx.amount).toFixed(4)} {tx.currency}
                    </TableCell>
                    <TableCell>
                      {tx.txHash ? (
                        <a
                          href={`https://polygonscan.com/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-mono text-sm text-primary hover:underline"
                        >
                          {truncateHash(tx.txHash)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{tx.confirmations || 0}</span>
                    </TableCell>
                    <TableCell>
                      {tx.gasUsed ? (
                        <span className="font-mono text-sm">{parseFloat(tx.gasUsed).toFixed(0)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(tx.createdAt!)}
                    </TableCell>
                    <TableCell>{getStatusBadge(tx.status || "pending")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
              <RefreshCw className="mb-4 h-12 w-12" />
              <p className="mb-2 font-medium">No transactions yet</p>
              <p className="text-sm">
                Transactions will appear here when you finance or repay invoices
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
