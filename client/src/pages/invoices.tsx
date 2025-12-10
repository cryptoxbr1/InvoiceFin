import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  CheckCircle,
  DollarSign,
  ExternalLink,
  FileText,
  AlertCircle,
  Loader2,
  Shield,
} from "lucide-react";
import type { Invoice } from "@shared/schema";

function formatCurrency(amount: string | number, currency = "USD"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency === "MATIC" ? "USD" : currency,
    minimumFractionDigits: 2,
  }).format(num);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    verified: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    financed: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    repaid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    defaulted: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <Badge className={styles[status] || ""}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function Invoices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [verifyDialog, setVerifyDialog] = useState(false);
  const [financeDialog, setFinanceDialog] = useState(false);
  const [financingDetails, setFinancingDetails] = useState<{
    amount: number;
    percentage: number;
    fee: number;
  } | null>(null);

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const verifyMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return apiRequest("POST", `/api/invoices/${invoiceId}/verify`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setVerifyDialog(false);
      toast({
        title: "Invoice verified",
        description: "AI analysis and risk assessment complete",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const financeMutation = useMutation({
    mutationFn: async ({ invoiceId, txHash }: { invoiceId: string; txHash: string }) => {
      return apiRequest("POST", `/api/invoices/${invoiceId}/finance`, { txHash });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setFinanceDialog(false);
      toast({
        title: "Invoice financed",
        description: "Funds are being transferred to your wallet",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Financing failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const calculateFinancing = async (invoice: Invoice) => {
    try {
      const response = await apiRequest("POST", "/api/calculate-financing", {
        amount: parseFloat(invoice.amount),
        riskScore: invoice.aiRiskScore || 50,
      });
      setFinancingDetails(response as any);
    } catch (error) {
      console.error("Failed to calculate financing:", error);
    }
  };

  const handleVerify = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setVerifyDialog(true);
  };

  const handleFinance = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    await calculateFinancing(invoice);
    setFinanceDialog(true);
  };

  const confirmFinance = async () => {
    if (!selectedInvoice) return;
    
    // In a real app, this would trigger a wallet transaction
    // For now, we simulate with a mock txHash
    const mockTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join("")}`;
    financeMutation.mutate({ invoiceId: selectedInvoice.id, txHash: mockTxHash });
  };

  const filteredInvoices = invoices?.filter((inv) =>
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    inv.buyerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-invoices-title">Invoices</h1>
          <p className="text-muted-foreground">
            Manage and finance your invoices
          </p>
        </div>
        <Link href="/invoices/upload">
          <Button data-testid="button-new-invoice">
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>
                {invoices?.length || 0} total invoices
              </CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-invoices"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredInvoices && filteredInvoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{invoice.invoiceNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>{invoice.buyerName}</TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(invoice.amount, invoice.currency || "USD")}
                    </TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell>
                      {invoice.aiRiskScore !== null ? (
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              invoice.aiRiskScore >= 70
                                ? "bg-green-500"
                                : invoice.aiRiskScore >= 40
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                          />
                          <span className="font-mono">{invoice.aiRiskScore}/100</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status || "pending")}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {invoice.status === "pending" && (
                            <DropdownMenuItem onClick={() => handleVerify(invoice)}>
                              <Shield className="mr-2 h-4 w-4" />
                              Verify with AI
                            </DropdownMenuItem>
                          )}
                          {invoice.status === "verified" && (
                            <DropdownMenuItem onClick={() => handleFinance(invoice)}>
                              <DollarSign className="mr-2 h-4 w-4" />
                              Get Financing
                            </DropdownMenuItem>
                          )}
                          {invoice.blockchainTxHash && (
                            <DropdownMenuItem asChild>
                              <a
                                href={`https://polygonscan.com/tx/${invoice.blockchainTxHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View on PolygonScan
                              </a>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
              <FileText className="mb-4 h-12 w-12" />
              <p className="mb-2 font-medium">No invoices found</p>
              <p className="text-sm">Upload your first invoice to get started</p>
              <Link href="/invoices/upload">
                <Button className="mt-4" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Invoice
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={verifyDialog} onOpenChange={setVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Verify Invoice with AI
            </DialogTitle>
            <DialogDescription>
              Our AI will analyze this invoice for authenticity, detect potential fraud,
              and calculate a risk score.
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="rounded-md border p-4">
                <div className="mb-2 flex justify-between">
                  <span className="text-sm text-muted-foreground">Invoice</span>
                  <span className="font-medium">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="mb-2 flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="font-mono">
                    {formatCurrency(selectedInvoice.amount, selectedInvoice.currency || "USD")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Buyer</span>
                  <span>{selectedInvoice.buyerName}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedInvoice && verifyMutation.mutate(selectedInvoice.id)}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Start Verification
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={financeDialog} onOpenChange={setFinanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Get Invoice Financing
            </DialogTitle>
            <DialogDescription>
              Receive instant liquidity for your verified invoice on Polygon network.
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && financingDetails && (
            <div className="space-y-4">
              <div className="rounded-md border p-4">
                <div className="mb-2 flex justify-between">
                  <span className="text-sm text-muted-foreground">Invoice Value</span>
                  <span className="font-mono">
                    {formatCurrency(selectedInvoice.amount, selectedInvoice.currency || "USD")}
                  </span>
                </div>
                <div className="mb-2 flex justify-between">
                  <span className="text-sm text-muted-foreground">Advance Rate</span>
                  <span className="font-medium text-primary">{financingDetails.percentage}%</span>
                </div>
                <div className="mb-2 flex justify-between">
                  <span className="text-sm text-muted-foreground">Platform Fee</span>
                  <span className="font-mono">{formatCurrency(financingDetails.fee)}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between">
                  <span className="font-medium">You Receive</span>
                  <span className="font-mono text-lg font-bold text-green-600">
                    {formatCurrency(financingDetails.amount)}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 text-primary" />
                <p className="text-muted-foreground">
                  Funds will be transferred to your connected wallet as MATIC on Polygon network.
                  Make sure your wallet is connected.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinanceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmFinance} disabled={financeMutation.isPending}>
              {financeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Confirm Financing
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
