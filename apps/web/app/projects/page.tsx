"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Cpu, Clock } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  useEffect(() => {
    fetch(`${apiUrl}/api/v1/projects/`)
      .then((r) => r.json())
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [apiUrl]);

  const createProject = async () => {
    const name = newName.trim() || "Untitled Circuit";
    const res = await fetch(`${apiUrl}/api/v1/projects/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const project = await res.json();
    window.location.href = `/projects/${project.id}`;
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="text-muted-foreground text-sm hover:text-foreground">
            CircuitMind
          </Link>
          <h1 className="text-3xl font-bold mt-1">Projects</h1>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {creating && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4 flex gap-3">
          <input
            autoFocus
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none border-b border-border pb-1"
            placeholder="Project name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createProject();
              if (e.key === "Escape") setCreating(false);
            }}
          />
          <button
            onClick={createProject}
            className="text-sm font-medium text-primary hover:opacity-80"
          >
            Create
          </button>
          <button
            onClick={() => setCreating(false)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Cpu size={48} className="mx-auto mb-4 opacity-30" />
          <p>No projects yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="rounded-lg border border-border bg-card p-5 hover:border-primary/50 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {p.name}
                  </h2>
                  {p.description && (
                    <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                  )}
                </div>
                <Cpu size={20} className="text-muted-foreground shrink-0" />
              </div>
              <div className="flex items-center gap-1 mt-4 text-xs text-muted-foreground">
                <Clock size={12} />
                {new Date(p.updated_at).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
