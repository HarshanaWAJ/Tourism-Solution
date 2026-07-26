import { io } from "socket.io-client";
import { getToken } from "./client.js";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "http://localhost:4000";

let socket = null;

/** Lazily creates a single shared, authenticated socket connection. */
export function getSocket() {
  if (socket) return socket;

  socket = io(SOCKET_URL, { autoConnect: true, transports: ["websocket", "polling"] });

  socket.on("connect", () => {
    const token = getToken();
    if (token) socket.emit("auth", { token });
  });

  return socket;
}
