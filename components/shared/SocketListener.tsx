"use client";

import { useSocket } from "@/hooks/useSocket";

export function SocketListener() {
  useSocket();
  return null;
}
