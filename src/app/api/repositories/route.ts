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

    const repositories = await prisma.repository.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            pullRequests: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(repositories);
  } catch (error: any) {
    console.error('Get repositories error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { githubId, name, fullName, owner, isPrivate } = body;

    const repository = await prisma.repository.create({
      data: {
        githubId,
        name,
        fullName,
        owner,
        private: isPrivate || false,
        userId: session.user.id,
      },
    });

    return NextResponse.json(repository);
  } catch (error: any) {
    console.error('Create repository error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
