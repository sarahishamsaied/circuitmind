"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ChevronLeft, Download, Cpu } from "lucide-react";
import { PromptPanel } from "./PromptPanel";
import { PCBPreview } from "./PCBPreview";
import { ComponentPalette } from "./ComponentPalette";

const SchematicCanvas = dynamic(
  () => import("./SchematicCanvas").then((m) => ({ default: m.SchematicCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm bg-[#0d1117]">
        Loading schematic…
      </div>
    ),
  }
);
import { PropertiesPanel } from "./PropertiesPanel";
import { ExportDialog } from "./ExportDialog";
import { useCircuitStore } from "@/store/circuitStore";
import { useCircuitWebSocket } from "@/hooks/useCircuitWebSocket";

interface Props {
  projectId: string;
}

export function EditorLayout({ projectId }: Props) {
  const circuit = useCircuitStore((s) => s.circuit);
  const [showExport, setShowExport] = useState(false);
  const { sendPrompt, sendUndo, sendReset, sendSave } = useCircuitWebSocket(projectId);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between h-12 px-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ChevronLeft size={16} />
            Projects
          </Link>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-primary" />
            <span className="text-sm font-medium">{circuit.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </header>

      {/* Main three-panel layout */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Left: Prompt / Chat */}
          <Panel defaultSize={24} minSize={18} maxSize={40}>
            <PromptPanel sendPrompt={sendPrompt} sendUndo={sendUndo} sendReset={sendReset} sendSave={sendSave} />
          </Panel>

          <PanelResizeHandle className="w-px bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />

          {/* Center: Schematic + 3D */}
          <Panel defaultSize={52} minSize={30}>
            <PanelGroup direction="vertical" className="h-full">
              <Panel defaultSize={65} minSize={40}>
                <div className="flex flex-col h-full min-h-0">
                  <ComponentPalette />
                  <div className="flex-1 min-h-0 relative">
                    <SchematicCanvas />
                  </div>
                </div>
              </Panel>
              <PanelResizeHandle className="h-px bg-border hover:bg-primary/50 transition-colors cursor-row-resize" />
              <Panel defaultSize={35} minSize={20}>
                <PCBPreview />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-px bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />

          {/* Right: Properties */}
          <Panel defaultSize={24} minSize={18} maxSize={40}>
            <PropertiesPanel />
          </Panel>
        </PanelGroup>
      </div>

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </div>
  );
}
