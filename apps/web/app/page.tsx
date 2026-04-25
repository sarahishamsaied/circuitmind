import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          Circuit<span className="text-primary">Mind</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-lg">
          Describe an electrical circuit in plain language.
          AI generates a schematic, validates it, and exports to SPICE or KiCad.
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/projects"
          className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Open Projects
        </Link>
        <Link
          href="/projects/new"
          className="rounded-lg border border-border px-6 py-3 font-semibold hover:bg-muted transition-colors"
        >
          New Circuit
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-8 text-sm text-muted-foreground max-w-2xl">
        {[
          { icon: "⚡", title: "AI-Powered", desc: "Claude generates complete schematics from natural language" },
          { icon: "📐", title: "Interactive Canvas", desc: "Drag, zoom, and inspect components on a live schematic" },
          { icon: "💾", title: "Export Ready", desc: "One-click export to SPICE netlists or KiCad format" },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="text-2xl">{f.icon}</div>
            <div className="font-medium text-foreground">{f.title}</div>
            <div>{f.desc}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
