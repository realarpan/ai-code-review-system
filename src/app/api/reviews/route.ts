import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reviews = await prisma.codeReview.findMany({
      where: {
        pullRequest: {
          repository: {
            userId: session.user.id,
          },
        },
      },
      include: {
        pullRequest: {
          include: {
            repository: true,
          },
        },
        _count: {
          select: {
            findings: true,
            tasks: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json(reviews);
  } catch (error: any) {
    console.error('Get reviews error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
