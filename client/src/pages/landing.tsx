import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowRight,
  Zap,
  Shield,
  TrendingUp,
  DollarSign,
  FileText,
  Globe,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { SiPolygon } from "react-icons/si";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold">InvoiceFin</span>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="/api/login">
              <Button data-testid="button-login">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-20 text-center">
          <Badge className="mb-4" variant="secondary">
            <SiPolygon className="mr-1 h-3 w-3" />
            Powered by Polygon
          </Badge>
          
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Invoice Financing
            <br />
            <span className="text-primary">Powered by AI & Blockchain</span>
          </h1>
          
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Get instant liquidity for your invoices. Our AI analyzes risk in real-time, 
            and you receive 70-80% of invoice value within minutes on Polygon network.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="/api/login">
              <Button size="lg" data-testid="button-cta-primary">
                Start Financing
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <a
              href="https://polygon.technology"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" variant="outline" data-testid="button-learn-polygon">
                Learn About Polygon
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Zap className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">Instant Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Upload your invoice and get AI-powered risk assessment in seconds. 
                  Our system verifies authenticity and detects fraud automatically.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <DollarSign className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">70-80% Advance</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Receive up to 80% of your invoice value immediately. 
                  The exact percentage depends on your risk score and payment history.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Shield className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">Blockchain Security</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  All transactions are recorded on Polygon blockchain. 
                  Transparent, immutable, and verifiable by anyone.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">Build Credit</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Every successful repayment improves your risk score, 
                  unlocking higher financing percentages and better terms.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-y bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
            
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  1
                </div>
                <h3 className="mb-2 text-xl font-semibold">Register Business</h3>
                <p className="text-muted-foreground">
                  Complete KYC verification with your business details and tax ID.
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  2
                </div>
                <h3 className="mb-2 text-xl font-semibold">Upload Invoice</h3>
                <p className="text-muted-foreground">
                  Upload your invoice as PDF or image. AI extracts and verifies all data.
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  3
                </div>
                <h3 className="mb-2 text-xl font-semibold">Get Financed</h3>
                <p className="text-muted-foreground">
                  Connect your wallet and receive MATIC instantly on Polygon.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-8 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">For Businesses</CardTitle>
                <CardDescription>
                  Stop waiting 30-90 days for invoice payments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
                  <span>Immediate cash flow improvement</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
                  <span>Lower fees than traditional factoring</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
                  <span>No credit checks or lengthy applications</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
                  <span>Build on-chain reputation over time</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">For Liquidity Providers</CardTitle>
                <CardDescription>
                  Earn yield by funding business invoices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
                  <span>Competitive APY on your MATIC</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
                  <span>AI-verified invoice quality</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
                  <span>Diversified across many invoices</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
                  <span>Real-world asset backing</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-12">
          <div className="container mx-auto px-4 text-center">
            <div className="flex flex-wrap items-center justify-center gap-8">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Multi-Currency Support</span>
              </div>
              <div className="flex items-center gap-2">
                <SiPolygon className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Polygon Network</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Gemini AI Powered</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Built for Polygon Buildathon 2024</p>
          <p className="mt-2">
            Invoice Financing Platform - AI + DeFi on Polygon POS
          </p>
        </div>
      </footer>
    </div>
  );
}
