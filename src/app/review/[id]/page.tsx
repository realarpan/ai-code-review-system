'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { io, Socket } from 'socket.io-client';
import { AlertCircle, Shield, TestTube, Zap, Code2, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

let socket: Socket;

export default function ReviewDetailPage() {
  const params = useParams();
  const reviewId = params.id as string;
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReview();
    initializeWebSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [reviewId]);

  const fetchReview = async () => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`);
      const data = await response.json();
      setReview(data);
    } catch (error) {
      console.error('Error fetching review:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeWebSocket = () => {
    socket = io({
      path: '/api/socket',
    });

    socket.on('connect', () => {
      socket.emit('join-review', reviewId);
    });

    socket.on('review-update', (data) => {
      setReview((prev: any) => ({ ...prev, ...data }));
    });

    socket.on('task-update', (data) => {
      setReview((prev: any) => ({
        ...prev,
        tasks: prev.tasks.map((task: any) => (task.id === data.taskId ? { ...task, ...data } : task)),
      }));
    });
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      CRITICAL: 'bg-red-500',
      HIGH: 'bg-orange-500',
      MEDIUM: 'bg-yellow-500',
      LOW: 'bg-blue-500',
      INFO: 'bg-gray-500',
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-500';
  };

  const getAgentIcon = (type: string) => {
    const icons = {
      CODE_REVIEWER: Code2,
      SECURITY_SCANNER: Shield,
      TEST_GENERATOR: TestTube,
      PERFORMANCE_OPTIMIZER: Zap,
    };
    return icons[type as keyof typeof icons] || Code2;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading review...</p>
        </div>
      </div>
    );
  }

  if (!review) {
    return <div className="container mx-auto px-4 py-8">Review not found</div>;
  }

  const completedTasks = review.tasks.filter((t: any) => t.status === 'COMPLETED').length;
  const progress = (completedTasks / review.tasks.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">{review.pullRequest.title}</h1>
          <p className="text-muted-foreground">
            {review.pullRequest.repository.fullName} • PR #{review.pullRequest.number}
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {review.overallScore !== null ? `${review.overallScore}/100` : 'Pending'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={review.status === 'COMPLETED' ? 'default' : 'outline'} className="text-base">
                {review.status}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Findings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{review.findings.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Agent Progress</CardTitle>
            <CardDescription>
              {completedTasks} of {review.tasks.length} agents completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="mb-4" />
            <div className="grid gap-4 md:grid-cols-2">
              {review.tasks.map((task: any) => {
                const Icon = getAgentIcon(task.agent.type);
                return (
                  <div key={task.id} className="flex items-center gap-3 rounded-lg border p-4">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{task.agent.name}</div>
                      <div className="text-sm text-muted-foreground">{task.status}</div>
                    </div>
                    {task.status === 'COMPLETED' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Findings ({review.findings.length})</TabsTrigger>
            <TabsTrigger value="critical">
              Critical ({review.findings.filter((f: any) => f.severity === 'CRITICAL').length})
            </TabsTrigger>
            <TabsTrigger value="high">
              High ({review.findings.filter((f: any) => f.severity === 'HIGH').length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <div className="space-y-4">
              {review.findings.map((finding: any) => (
                <Card key={finding.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${getSeverityColor(finding.severity)}`} />
                          <Badge variant="outline">{finding.severity}</Badge>
                          <Badge variant="secondary">{finding.type.replace(/_/g, ' ')}</Badge>
                        </div>
                        <CardTitle className="mb-2">{finding.title}</CardTitle>
                        <CardDescription>{finding.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  {(finding.file || finding.suggestion) && (
                    <CardContent>
                      {finding.file && (
                        <div className="mb-2 text-sm text-muted-foreground">
                          {finding.file}
                          {finding.line && `:${finding.line}`}
                        </div>
                      )}
                      {finding.suggestion && (
                        <div className="rounded-lg bg-muted p-3">
                          <div className="mb-1 text-sm font-medium">Suggestion:</div>
                          <div className="text-sm text-muted-foreground">{finding.suggestion}</div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="critical">
            <div className="space-y-4">
              {review.findings
                .filter((f: any) => f.severity === 'CRITICAL')
                .map((finding: any) => (
                  <Card key={finding.id}>
                    {/* Same card content as above */}
                  </Card>
                ))}
            </div>
          </TabsContent>
          <TabsContent value="high">
            <div className="space-y-4">
              {review.findings
                .filter((f: any) => f.severity === 'HIGH')
                .map((finding: any) => (
                  <Card key={finding.id}>
                    {/* Same card content as above */}
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
