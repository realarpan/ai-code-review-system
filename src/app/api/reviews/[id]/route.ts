import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const review = await prisma.codeReview.findUnique({
      where: { id: params.id },
      include: {
        pullRequest: {
          include: {
            repository: true,
          },
        },
        tasks: {
          include: {
            agent: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        findings: {
          orderBy: [
            { severity: 'desc' },
            { createdAt: 'desc' },
          ],
        },
      },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error: any) {
    console.error('Get review error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
