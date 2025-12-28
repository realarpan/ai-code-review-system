'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GitPullRequest, Clock, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReviews();
    }
  }, [status]);

  const fetchReviews = async () => {
    try {
      const response = await fetch('/api/reviews');
      const data = await response.json();
      setReviews(data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { variant: 'outline' as const, icon: Clock },
      IN_PROGRESS: { variant: 'default' as const, icon: GitPullRequest },
      COMPLETED: { variant: 'default' as const, icon: CheckCircle2 },
      FAILED: { variant: 'destructive' as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <GitPullRequest className="h-6 w-6" />
            <span className="text-xl font-bold">AI Code Review</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{session?.user?.name}</span>
            <Button variant="outline" onClick={() => router.push('/api/auth/signout')}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Code Reviews</h1>
          <p className="text-muted-foreground">View and manage your automated code reviews</p>
        </div>

        {reviews.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <GitPullRequest className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold">No reviews yet</h3>
              <p className="mb-4 text-muted-foreground">Connect your GitHub repositories to get started</p>
              <Button>Connect Repository</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reviews.map((review) => (
              <Card key={review.id} className="hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-1">
                        <Link
                          href={`/review/${review.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {review.pullRequest.title}
                        </Link>
                      </CardTitle>
                      <CardDescription>
                        {review.pullRequest.repository.fullName} • PR #{review.pullRequest.number}
                      </CardDescription>
                    </div>
                    {getStatusBadge(review.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-6 text-sm text-muted-foreground">
                      <span>{review._count.findings} findings</span>
                      <span>{review._count.tasks} agents</span>
                      {review.overallScore !== null && (
                        <span className="font-semibold">Score: {review.overallScore}/100</span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
