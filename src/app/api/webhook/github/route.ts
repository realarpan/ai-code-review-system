import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { agentOrchestrator } from '@/lib/agent-orchestrator';

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET!;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    if (!signature || !verifySignature(payload, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = request.headers.get('x-github-event');
    const data = JSON.parse(payload);

    if (event === 'pull_request') {
      const { action, pull_request, repository } = data;

      if (action === 'opened' || action === 'synchronize') {
        const repo = await prisma.repository.findFirst({
          where: { githubId: repository.id.toString() },
        });

        if (!repo) {
          return NextResponse.json({ message: 'Repository not registered' });
        }

        let pullRequest = await prisma.pullRequest.findFirst({
          where: { githubId: pull_request.id.toString() },
        });

        if (!pullRequest) {
          pullRequest = await prisma.pullRequest.create({
            data: {
              githubId: pull_request.id.toString(),
              number: pull_request.number,
              title: pull_request.title,
              description: pull_request.body,
              state: pull_request.state,
              author: pull_request.user.login,
              baseBranch: pull_request.base.ref,
              headBranch: pull_request.head.ref,
              repositoryId: repo.id,
            },
          });
        }

        await agentOrchestrator.createCodeReview(pullRequest.id);

        return NextResponse.json({
          message: 'Code review initiated',
          pullRequestId: pullRequest.id,
        });
      }
    }

    return NextResponse.json({ message: 'Event processed' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
