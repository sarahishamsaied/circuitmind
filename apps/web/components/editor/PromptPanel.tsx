"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, RotateCcw, Undo2, Save } from "lucide-react";
import { useCircuitStore } from "@/store/circuitStore";
import type { AgentMessage } from "@/store/circuitStore";

interface Props {
  sendPrompt: (prompt: string) => void;
  sendUndo: () => void;
  sendReset: () => void;
  sendSave: () => void;
}

const EXAMPLE_PROMPTS = [
  "Build a 5V to 3.3V LDO regulator using AMS1117",
  "Create an LED circuit with a current limiting resistor at 3.3V",
  "Design a 555 timer astable multivibrator at 1kHz",
  "Add a bypass capacitor and decoupling cap to the existing circuit",
];

export function PromptPanel({ sendPrompt, sendUndo, sendReset, sendSave }: Props) {
  const agentStatus = useCircuitStore((s) => s.agentStatus);
  const agentStatusText = useCircuitStore((s) => s.agentStatusText);
  const agentMessages = useCircuitStore((s) => s.agentMessages);
  const circuit = useCircuitStore((s) => s.circuit);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentMessages]);

  const handleSubmit = () => {
    const prompt = input.trim();
    if (!prompt || agentStatus === "thinking") return;
    sendPrompt(prompt);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold">{circuit.name}</h2>
          <p className="text-xs text-muted-foreground">
            {circuit.components.length} components · {circuit.nets.length} nets
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={sendUndo}
            title="Undo"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={sendSave}
            title="Save"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Save size={14} />
          </button>
          <button
            onClick={sendReset}
            title="Reset circuit"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {agentMessages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">Try an example:</p>
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => setInput(p)}
                className="block w-full text-left text-xs rounded border border-border bg-muted/30 hover:bg-muted px-3 py-2 transition-colors text-muted-foreground hover:text-foreground"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {agentMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {agentStatus === "thinking" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={12} className="animate-spin" />
            {agentStatusText || "Thinking…"}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none rounded-lg bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground p-2.5 outline-none focus:border-primary/50 transition-colors min-h-[60px] max-h-[120px]"
            placeholder="Describe a circuit or modification…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={agentStatus === "thinking"}
            rows={2}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || agentStatus === "thinking"}
            className="p-2.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
          >
            {agentStatus === "thinking" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}

function looksLikeCircuitJsonBlob(text: string | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  return t.startsWith("{") && t.length > 80 && t.includes('"components"');
}

function MessageBubble({ message }: { message: AgentMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-primary/20 border border-primary/30 rounded-lg px-3 py-2 text-sm max-w-[85%]">
          {message.text}
        </div>
      </div>
    );
  }

  if (message.role === "tool") {
    return (
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5 w-4 h-4 rounded bg-muted flex items-center justify-center">
          <span className="text-[8px] text-muted-foreground">⚡</span>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          <span className="text-primary/80">{message.tool_name}</span>
          {message.args && (
            <span className="ml-1 opacity-60">
              ({Object.entries(message.args)
                .slice(0, 2)
                .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                .join(", ")}
              {Object.keys(message.args).length > 2 ? "…" : ""})
            </span>
          )}
        </div>
      </div>
    );
  }

  const text = message.text ?? "";
  if (looksLikeCircuitJsonBlob(text)) {
    let count = 0;
    try {
      const j = JSON.parse(text) as { components?: unknown[] };
      count = Array.isArray(j.components) ? j.components.length : 0;
    } catch {
      /* ignore */
    }
    return (
      <div className="space-y-2 text-sm">
        <p className="text-amber-200/90 leading-relaxed">
          {count === 0
            ? "The assistant returned circuit data as text instead of updating the schematic with tools. Try your prompt again — the server now retries in that case."
            : `The assistant sent circuit data as text (${count} part(s)) instead of using tools. Re-send your request if the canvas did not update.`}
        </p>
        <details className="group">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Show raw response
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-border bg-muted/30 p-2 text-[11px] leading-snug font-mono text-muted-foreground">
            {text}
          </pre>
        </details>
      </div>
    );
  }

  return <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{text}</div>;
}
