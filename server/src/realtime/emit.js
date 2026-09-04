// A tiny indirection so any module can push a real-time event to a user without
// importing the Socket.IO server (which would create an import cycle with the
// modules it, in turn, needs). realtime/index.js calls setIo() on startup.

let io = null;

export function setIo(instance) {
  io = instance;
}

export function emitToUser(userId, event, payload) {
  if (!io) return; // realtime not initialised (e.g. during tests) — no-op
  io.to(`user:${userId}`).emit(event, payload);
}
