"use client";
import { useEffect, useRef } from "react";
import Pusher, { type Channel } from "pusher-js";

let _client: Pusher | null = null;

function getClient(): Pusher | null {
  if (typeof window === "undefined") return null;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu";
  if (!key) return null;
  if (!_client) {
    _client = new Pusher(key, { cluster, forceTLS: true });
  }
  return _client;
}

type Handler = (data: unknown) => void;

/**
 * Subscribe to a Pusher channel and bind one or more event handlers.
 * Safely no-ops when Pusher env vars are not configured.
 */
export function useRealtime(channelName: string | null, handlers: Record<string, Handler>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!channelName) return;
    const client = getClient();
    if (!client) return;
    const ch: Channel = client.subscribe(channelName);
    const bound: { event: string; cb: Handler }[] = [];
    for (const event of Object.keys(handlersRef.current)) {
      const cb: Handler = (data) => handlersRef.current[event]?.(data);
      ch.bind(event, cb);
      bound.push({ event, cb });
    }
    return () => {
      for (const { event, cb } of bound) ch.unbind(event, cb);
      client.unsubscribe(channelName);
    };
  }, [channelName]);
}
