import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Upload,
  FileText,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  X,
} from "lucide-react";

const invoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  buyerName: z.string().min(2, "Buyer name is required"),
  buyerEmail: z.string().email().optional().or(z.literal("")),
  buyerAddress: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  currency: z.string().default("USD"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface AIAnalysisResult {
  isValid: boolean;
  confidence: number;
  extractedData: {
    invoiceNumber?: string;
    amount?: number;
    currency?: string;
    issueDate?: string;
    dueDate?: string;
    buyerName?: string;
    buyerAddress?: string;
    sellerName?: string;
    description?: string;
  };
  issues: string[];
  suggestions: string[];
}

const currencies = ["USD", "EUR", "GBP", "MATIC", "USDC", "USDT"];

export default function InvoiceUpload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [step, setStep] = useState<"upload" | "review" | "submit">("upload");

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: "",
      buyerName: "",
      buyerEmail: "",
      buyerAddress: "",
      amount: "",
      currency: "USD",
      issueDate: "",
      dueDate: "",
      description: "",
    },
  });

  const analyzeFile = useCallback(async (uploadedFile: File) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      const response = await fetch("/api/invoices/analyze", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to analyze invoice");
      }

      const result: AIAnalysisResult = await response.json();
      setAnalysisResult(result);

      if (result.extractedData) {
        const data = result.extractedData;
        if (data.invoiceNumber) form.setValue("invoiceNumber", data.invoiceNumber);
        if (data.buyerName) form.setValue("buyerName", data.buyerName);
        if (data.buyerAddress) form.setValue("buyerAddress", data.buyerAddress);
        if (data.amount) form.setValue("amount", data.amount.toString());
        if (data.currency) form.setValue("currency", data.currency);
        if (data.issueDate) form.setValue("issueDate", data.issueDate.split("T")[0]);
        if (data.dueDate) form.setValue("dueDate", data.dueDate.split("T")[0]);
        if (data.description) form.setValue("description", data.description);
      }

      setStep("review");
      toast({
        title: "AI Analysis Complete",
        description: `Confidence: ${Math.round(result.confidence * 100)}%`,
      });
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: "Failed to analyze invoice. Please enter details manually.",
        variant: "destructive",
      });
      setStep("review");
    } finally {
      setIsAnalyzing(false);
    }
  }, [form, toast]);

  const handleFileDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && (droppedFile.type.includes("pdf") || droppedFile.type.includes("image"))) {
        setFile(droppedFile);
        analyzeFile(droppedFile);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or image file",
          variant: "destructive",
        });
      }
    },
    [analyzeFile, toast]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        analyzeFile(selectedFile);
      }
    },
    [analyzeFile]
  );

  const createMutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      return apiRequest("POST", "/api/invoices", {
        ...data,
        amount: data.amount,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Invoice created",
        description: "Your invoice has been submitted for verification.",
      });
      setLocation("/invoices");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvoiceFormValues) => {
    createMutation.mutate(data);
  };

  const removeFile = () => {
    setFile(null);
    setAnalysisResult(null);
    setStep("upload");
    form.reset();
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-upload-title">
          Upload Invoice
        </h1>
        <p className="text-muted-foreground">
          Upload your invoice for AI analysis and financing
        </p>
      </div>

      <div className="mb-8 flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
            step === "upload" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          1
        </div>
        <div className="h-0.5 flex-1 bg-muted" />
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
            step === "review" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          2
        </div>
        <div className="h-0.5 flex-1 bg-muted" />
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
            step === "submit" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          3
        </div>
      </div>

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Invoice Document
            </CardTitle>
            <CardDescription>
              Upload a PDF or image of your invoice. Our AI will extract the details automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors hover:border-primary/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              data-testid="dropzone-invoice"
            >
              {isAnalyzing ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="font-medium">Analyzing invoice with AI...</p>
                    <p className="text-sm text-muted-foreground">
                      Extracting data and verifying authenticity
                    </p>
                  </div>
                  <Progress value={66} className="w-48" />
                </div>
              ) : (
                <>
                  <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="mb-2 text-lg font-medium">
                    Drag and drop your invoice here
                  </p>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Supports PDF, PNG, JPG (max 10MB)
                  </p>
                  <label>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,image/*"
                      onChange={handleFileSelect}
                      data-testid="input-file-upload"
                    />
                    <Button variant="outline" asChild>
                      <span>Browse Files</span>
                    </Button>
                  </label>
                </>
              )}
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm text-muted-foreground">or enter manually</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => setStep("review")}>
                Enter Invoice Details Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(step === "review" || step === "submit") && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
                <CardDescription>
                  {analysisResult
                    ? "Review and confirm the AI-extracted data"
                    : "Enter your invoice information"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {file && (
                  <div className="mb-6 flex items-center justify-between rounded-md bg-muted p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={removeFile}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="invoiceNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Invoice Number *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="INV-001"
                                {...field}
                                data-testid="input-invoice-number"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="buyerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Buyer Name *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Client Company"
                                {...field}
                                data-testid="input-buyer-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="10000.00"
                                {...field}
                                data-testid="input-amount"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-currency">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {currencies.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="issueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Issue Date *</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                data-testid="input-issue-date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date *</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                data-testid="input-due-date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="buyerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Buyer Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="buyer@example.com"
                              {...field}
                              data-testid="input-buyer-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Invoice description or notes"
                              className="resize-none"
                              {...field}
                              data-testid="input-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createMutation.isPending}
                      data-testid="button-submit-invoice"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Invoice...
                        </>
                      ) : (
                        <>
                          Submit Invoice
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {analysisResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Validity</span>
                    <Badge variant={analysisResult.isValid ? "default" : "destructive"}>
                      {analysisResult.isValid ? (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Valid
                        </>
                      ) : (
                        <>
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Issues Found
                        </>
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Confidence</span>
                    <span className="font-mono font-medium">
                      {Math.round(analysisResult.confidence * 100)}%
                    </span>
                  </div>
                  {analysisResult.issues.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">Issues:</p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {analysisResult.issues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <AlertCircle className="mt-0.5 h-3 w-3 text-destructive" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysisResult.suggestions.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">Suggestions:</p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {analysisResult.suggestions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ol className="list-inside list-decimal space-y-2">
                  <li>Submit invoice for verification</li>
                  <li>AI will analyze risk and fraud</li>
                  <li>Connect wallet to receive funds</li>
                  <li>Get 70-80% advance on Polygon</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
