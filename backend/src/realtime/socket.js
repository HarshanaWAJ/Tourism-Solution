import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io = null;

/**
 * Realtime layer for the taxi feature. Deliberately thin: clients only use
 * sockets to *subscribe* to rooms and receive pushes. All writes (location
 * pings, ride status changes, ride requests) go through the normal
 * authenticated REST routes, which then call getIO().to(room).emit(...) —
 * that way there's a single source of truth (MongoDB) and no separate
 * auth/validation path to keep in sync.
 *
 * Rooms:
 *   user:{userId}   — a specific tourist or driver's personal channel
 *                      (used to push "you have a new ride request", etc.)
 *   ride:{rideId}   — everyone actively watching one ride (tourist + driver
 *                      + any admin who opened it) gets live location/status
 *   admin:live      — every connected admin, for the live fleet map
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN || "*" },
  });

  io.on("connection", (socket) => {
    socket.on("auth", ({ token }) => {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.data.user = payload;
        socket.join(`user:${payload.id}`);
        if (payload.role === "admin") socket.join("admin:live");
        socket.emit("auth:ok", { userId: payload.id, role: payload.role });
      } catch {
        socket.emit("auth:error", { error: "Invalid or expired token" });
      }
    });

    socket.on("ride:join", ({ rideId }) => {
      if (socket.data.user && rideId) socket.join(`ride:${rideId}`);
    });

    socket.on("ride:leave", ({ rideId }) => {
      if (rideId) socket.leave(`ride:${rideId}`);
    });

    socket.on("disconnect", () => {
      // Rooms are cleaned up automatically by socket.io on disconnect.
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialized — initSocket(httpServer) must run first");
  return io;
}
