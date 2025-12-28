import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from './redis';
import { prisma } from './prisma';
import { AgentType, TaskStatus, ReviewStatus } from '@prisma/client';
import { emitReviewUpdate, emitTaskUpdate } from './websocket';
import { CodeReviewerAgent } from '@/agents/code-reviewer';
import { SecurityScannerAgent } from '@/agents/security-scanner';
import { TestGeneratorAgent } from '@/agents/test-generator';
import { PerformanceOptimizerAgent } from '@/agents/performance-optimizer';

export interface AgentTask {
  taskId: string;
  codeReviewId: string;
  agentType: AgentType;
  pullRequestData: any;
}

export class AgentOrchestrator {
  private taskQueue: Queue<AgentTask>;
  private agents: Map<AgentType, any>;

  constructor() {
    this.taskQueue = new Queue<AgentTask>('agent-tasks', {
      connection: redisConnection,
    });

    this.agents = new Map([
      [AgentType.CODE_REVIEWER, new CodeReviewerAgent()],
      [AgentType.SECURITY_SCANNER, new SecurityScannerAgent()],
      [AgentType.TEST_GENERATOR, new TestGeneratorAgent()],
      [AgentType.PERFORMANCE_OPTIMIZER, new PerformanceOptimizerAgent()],
    ]);
  }

  async createCodeReview(pullRequestId: string) {
    const pullRequest = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
      include: { repository: true },
    });

    if (!pullRequest) {
      throw new Error('Pull request not found');
    }

    const codeReview = await prisma.codeReview.create({
      data: {
        pullRequestId,
        status: ReviewStatus.PENDING,
      },
    });

    const agents = await prisma.agent.findMany({
      where: { isActive: true },
    });

    const tasks = await Promise.all(
      agents.map((agent, index) =>
        prisma.task.create({
          data: {
            codeReviewId: codeReview.id,
            agentId: agent.id,
            status: TaskStatus.PENDING,
            priority: index,
          },
        })
      )
    );

    for (const task of tasks) {
      await this.queueTask(task.id, codeReview.id, task.agent.type, pullRequest);
    }

    await prisma.codeReview.update({
      where: { id: codeReview.id },
      data: { status: ReviewStatus.IN_PROGRESS },
    });

    emitReviewUpdate(codeReview.id, {
      status: ReviewStatus.IN_PROGRESS,
      tasksCount: tasks.length,
    });

    return codeReview;
  }

  async queueTask(
    taskId: string,
    codeReviewId: string,
    agentType: AgentType,
    pullRequestData: any
  ) {
    await this.taskQueue.add(
      'process-task',
      {
        taskId,
        codeReviewId,
        agentType,
        pullRequestData,
      },
      {
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    await prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.QUEUED },
    });
  }

  async processTask(job: Job<AgentTask>) {
    const { taskId, codeReviewId, agentType, pullRequestData } = job.data;

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.PROCESSING,
        startedAt: new Date(),
      },
    });

    emitTaskUpdate(codeReviewId, taskId, {
      status: TaskStatus.PROCESSING,
    });

    try {
      const agent = this.agents.get(agentType);
      if (!agent) {
        throw new Error(`Agent ${agentType} not found`);
      }

      const result = await agent.analyze(pullRequestData);

      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.COMPLETED,
          result: JSON.stringify(result),
          completedAt: new Date(),
        },
      });

      if (result.findings && result.findings.length > 0) {
        await Promise.all(
          result.findings.map((finding: any) =>
            prisma.finding.create({
              data: {
                codeReviewId,
                type: finding.type,
                severity: finding.severity,
                title: finding.title,
                description: finding.description,
                file: finding.file,
                line: finding.line,
                suggestion: finding.suggestion,
                agentType,
              },
            })
          )
        );
      }

      emitTaskUpdate(codeReviewId, taskId, {
        status: TaskStatus.COMPLETED,
        result,
      });

      await this.checkReviewCompletion(codeReviewId);
    } catch (error: any) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.FAILED,
          error: error.message,
          completedAt: new Date(),
        },
      });

      emitTaskUpdate(codeReviewId, taskId, {
        status: TaskStatus.FAILED,
        error: error.message,
      });
    }
  }

  async checkReviewCompletion(codeReviewId: string) {
    const tasks = await prisma.task.findMany({
      where: { codeReviewId },
    });

    const allCompleted = tasks.every(
      (task) => task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED
    );

    if (allCompleted) {
      const findings = await prisma.finding.findMany({
        where: { codeReviewId },
      });

      const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
      const highCount = findings.filter((f) => f.severity === 'HIGH').length;
      const totalCount = findings.length;

      const overallScore = this.calculateScore(criticalCount, highCount, totalCount);

      await prisma.codeReview.update({
        where: { id: codeReviewId },
        data: {
          status: ReviewStatus.COMPLETED,
          overallScore,
          summary: this.generateSummary(findings),
        },
      });

      emitReviewUpdate(codeReviewId, {
        status: ReviewStatus.COMPLETED,
        overallScore,
        findingsCount: totalCount,
      });
    }
  }

  private calculateScore(critical: number, high: number, total: number): number {
    const baseScore = 100;
    const criticalPenalty = critical * 15;
    const highPenalty = high * 8;
    const otherPenalty = (total - critical - high) * 3;

    return Math.max(0, baseScore - criticalPenalty - highPenalty - otherPenalty);
  }

  private generateSummary(findings: any[]): string {
    const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
    const highCount = findings.filter((f) => f.severity === 'HIGH').length;
    const mediumCount = findings.filter((f) => f.severity === 'MEDIUM').length;

    return `Review completed with ${findings.length} findings: ${criticalCount} critical, ${highCount} high, ${mediumCount} medium severity issues detected.`;
  }

  createWorker() {
    return new Worker<AgentTask>(
      'agent-tasks',
      async (job) => {
        await this.processTask(job);
      },
      {
        connection: redisConnection,
        concurrency: 4,
      }
    );
  }
}

export const agentOrchestrator = new AgentOrchestrator();
