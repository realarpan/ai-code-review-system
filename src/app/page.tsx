import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Code2, Shield, TestTube, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <Code2 className="h-6 w-6" />
            <span className="text-xl font-bold">AI Code Review</span>
          </div>
          <Link href="/dashboard">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight">
            Multi-Agent AI Code Review
            <br />
            <span className="text-primary">& Optimization System</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
            Automatically review pull requests, detect vulnerabilities, generate test cases, and optimize
            performance with our intelligent multi-agent system.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg">
                Start Reviewing <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              View Demo
            </Button>
          </div>
        </section>

        <section className="border-t bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">Intelligent Agent System</h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-card p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Code2 className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Code Reviewer</h3>
                <p className="text-muted-foreground">
                  Analyzes code quality, identifies bugs, and suggests best practices with AI-powered insights.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Security Scanner</h3>
                <p className="text-muted-foreground">
                  Detects vulnerabilities, security flaws, and potential exploits in your codebase.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500 text-white">
                  <TestTube className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Test Generator</h3>
                <p className="text-muted-foreground">
                  Automatically generates comprehensive test cases to improve code coverage.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500 text-white">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Performance Optimizer</h3>
                <p className="text-muted-foreground">
                  Identifies bottlenecks and suggests optimizations for better performance.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 AI Code Review System. Built with Next.js and OpenAI.</p>
        </div>
      </footer>
    </div>
  );
}
