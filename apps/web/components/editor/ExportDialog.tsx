"use client";

import { useState } from "react";
import { Download, X, Loader2 } from "lucide-react";
import { useCircuitStore } from "@/store/circuitStore";

interface Props {
  onClose: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function ExportDialog({ onClose }: Props) {
  const circuit = useCircuitStore((s) => s.circuit);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: "spice" | "kicad") => {
    setLoading(format);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, circuit_ir: circuit }),
      });
      if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
      const data = await res.json();

      // Trigger file download
      const blob = new Blob([data.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl shadow-xl w-80 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Export Circuit</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-5">
          Export &ldquo;{circuit.name}&rdquo; with {circuit.components.length} components.
        </p>

        <div className="space-y-3">
          {[
            {
              format: "spice" as const,
              label: "SPICE Netlist",
              ext: ".sp",
              desc: "For simulation in LTspice, ngspice",
            },
            {
              format: "kicad" as const,
              label: "KiCad Netlist",
              ext: ".net",
              desc: "For PCB layout in KiCad",
            },
          ].map(({ format, label, ext, desc }) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={!!loading}
              className="w-full flex items-center justify-between rounded-lg border border-border bg-muted/20 hover:bg-muted/50 px-4 py-3 transition-colors disabled:opacity-50"
            >
              <div className="text-left">
                <div className="text-sm font-medium">
                  {label}{" "}
                  <span className="text-xs text-muted-foreground font-mono">{ext}</span>
                </div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
              {loading === format ? (
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              ) : (
                <Download size={16} className="text-muted-foreground" />
              )}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}
