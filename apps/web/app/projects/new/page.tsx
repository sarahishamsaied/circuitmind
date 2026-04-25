"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function NewProjectPage() {
  const router = useRouter();

  useEffect(() => {
    fetch(`${API_URL}/api/v1/projects/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled Circuit", description: "" }),
    })
      .then((r) => r.json())
      .then((project) => router.replace(`/projects/${project.id}`))
      .catch(console.error);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        Creating project…
      </div>
    </div>
  );
}
