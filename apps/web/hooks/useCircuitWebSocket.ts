"use client";

import { useCallback, useEffect, useRef } from "react";
import type { WSClientMessage, WSServerMessage } from "@circuitmind/circuit-ir";
import { useCircuitStore } from "@/store/circuitStore";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";
const RECONNECT_DELAY_MS = 3000;

export function useCircuitWebSocket(projectId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleServerMessage = useCircuitStore((s) => s.handleServerMessage);
  const addAgentMessage = useCircuitStore((s) => s.addAgentMessage);
  const setAgentStatus = useCircuitStore((s) => s.setAgentStatus);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_URL}/ws/projects/${projectId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setAgentStatus("idle", "");
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as WSServerMessage;
        handleServerMessage(msg);
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    ws.onerror = () => {
      setAgentStatus("error", "Connection error");
    };

    ws.onclose = () => {
      setAgentStatus("idle", "Disconnected");
      // Auto-reconnect
      reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };
  }, [projectId, handleServerMessage, setAgentStatus]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((msg: WSClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      setAgentStatus("error", "Not connected — please wait");
    }
  }, [setAgentStatus]);

  const sendPrompt = useCallback(
    (prompt: string) => {
      addAgentMessage({ role: "user", text: prompt });
      sendMessage({ type: "generate", prompt });
    },
    [addAgentMessage, sendMessage]
  );

  const sendUndo = useCallback(() => sendMessage({ type: "undo" }), [sendMessage]);
  const sendReset = useCallback(() => sendMessage({ type: "reset" }), [sendMessage]);
  const sendSave = useCallback(() => sendMessage({ type: "save" }), [sendMessage]);

  return { sendPrompt, sendUndo, sendReset, sendSave };
}
