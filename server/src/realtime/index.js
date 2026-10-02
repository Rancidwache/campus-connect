import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { setIo } from './emit.js';

// Real-time layer (proposal 3.2.6): carries new-message events, delivery
// receipts, and escrow / payment notifications. It never sees message
// plaintext — only the opaque ciphertext the client already produced.

export function initRealtime(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
  });

  // Authenticate the socket handshake with the same JWT as the REST API.
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('unauthorized'));

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, userName: true },
      });
      if (!user) return next(new Error('unauthorized'));

      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket.data;
    socket.join(`user:${userId}`);

    // Let a sender learn when the recipient is actively viewing the thread,
    // so the UI can show "delivered" without a round-trip to the DB.
    socket.on('thread:open', ({ withUserId }) => {
      if (withUserId) socket.to(`user:${withUserId}`).emit('thread:peer-open', { userId });
    });

    socket.on('disconnect', () => {
      socket.leave(`user:${userId}`);
    });
  });

  setIo(io);
  return io;
}
