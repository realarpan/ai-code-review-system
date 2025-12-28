import { Server as HTTPServer } from 'http';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;

export const initializeWebSocket = (server: HTTPServer) => {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-review', (reviewId: string) => {
      socket.join(`review-${reviewId}`);
      console.log(`Client ${socket.id} joined review ${reviewId}`);
    });

    socket.on('leave-review', (reviewId: string) => {
      socket.leave(`review-${reviewId}`);
      console.log(`Client ${socket.id} left review ${reviewId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('WebSocket not initialized');
  }
  return io;
};

export const emitReviewUpdate = (reviewId: string, data: any) => {
  if (io) {
    io.to(`review-${reviewId}`).emit('review-update', data);
  }
};

export const emitTaskUpdate = (reviewId: string, taskId: string, data: any) => {
  if (io) {
    io.to(`review-${reviewId}`).emit('task-update', { taskId, ...data });
  }
};
