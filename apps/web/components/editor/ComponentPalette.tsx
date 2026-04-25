"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentSearchResult } from "@circuitmind/circuit-ir";
import { PART_DRAG_MIME } from "@/lib/circuit/partDrag";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function dragPayload(part: ComponentSearchResult) {
  return JSON.stringify({
    type: part.type,
    value: part.value,
    package: part.package,
    mpn: part.mpn,
    part_number: part.mpn,
  });
}

function DraggablePartChip({
  part,
  className = "",
}: {
  part: ComponentSearchResult;
  className?: string;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(PART_DRAG_MIME, dragPayload(part));
        e.dataTransfer.effectAllowed = "copy";
      }}
      className={`shrink-0 px-2 py-1 rounded-md border border-border bg-muted/40 hover:bg-muted text-left text-xs cursor-grab active:cursor-grabbing ${className}`}
      title={`${part.description}\nDrag onto the schematic`}
    >
      <span className="font-mono text-[11px] text-foreground/90 block truncate">{part.mpn}</span>
      <span className="text-muted-foreground block truncate">
        {part.value} · {part.package}
      </span>
    </button>
  );
}

type PaletteTab = "search" | "catalog";

export function ComponentPalette() {
  const [tab, setTab] = useState<PaletteTab>("search");

  const [query, setQuery] = useState("10k");
  const [results, setResults] = useState<ComponentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<ComponentSearchResult[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const catalogLoadedOk = useRef(false);

  const [catalogPickMpn, setCatalogPickMpn] = useState("");
  const [catalogFilter, setCatalogFilter] = useState("");

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/api/v1/components/search?q=${encodeURIComponent(trimmed)}&limit=12`
      );
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as ComponentSearchResult[];
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void search(query), 250);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    if (tab !== "catalog" || catalogLoadedOk.current) return;
    let cancelled = false;
    (async () => {
      setListLoading(true);
      setListError(null);
      try {
        const res = await fetch(`${API_URL}/api/v1/components/list?limit=500`);
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as ComponentSearchResult[];
        if (cancelled) return;
        setCatalog(Array.isArray(data) ? data : []);
        catalogLoadedOk.current = true;
      } catch (e) {
        if (!cancelled) {
          setListError(e instanceof Error ? e.message : "Could not load catalog");
          setCatalog([]);
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const filteredCatalog = useMemo(() => {
    const f = catalogFilter.trim().toLowerCase();
    if (!f) return catalog;
    return catalog.filter(
      (p) =>
        p.mpn.toLowerCase().includes(f) ||
        p.value.toLowerCase().includes(f) ||
        p.package.toLowerCase().includes(f) ||
        p.description.toLowerCase().includes(f) ||
        p.manufacturer.toLowerCase().includes(f)
    );
  }, [catalog, catalogFilter]);

  const pickedFromDropdown = useMemo(
    () => (catalogPickMpn ? catalog.find((p) => p.mpn === catalogPickMpn) ?? null : null),
    [catalog, catalogPickMpn]
  );

  return (
    <div className="shrink-0 border-b border-border bg-card/95 px-2 py-2 flex flex-col gap-2">
      <div className="flex gap-1 p-0.5 rounded-lg bg-muted/50 w-fit">
        <button
          type="button"
          onClick={() => setTab("search")}
          className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
            tab === "search" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setTab("catalog")}
          className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
            tab === "catalog" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All parts
        </button>
      </div>

      {tab === "search" && (
        <>
          <div className="flex items-center gap-2">
            <label htmlFor="part-search" className="text-xs text-muted-foreground whitespace-nowrap">
              Query
            </label>
            <input
              id="part-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="MPN, value, package…"
              className="flex-1 min-w-0 h-8 px-2 text-sm rounded-md border border-border bg-background"
            />
            {loading && <span className="text-xs text-muted-foreground">Searching…</span>}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-1.5 overflow-x-auto pb-1 min-h-[36px] items-center">
            {results.length === 0 && !loading && query.trim().length >= 1 && !error && (
              <span className="text-xs text-muted-foreground">No matches</span>
            )}
            {results.map((part) => (
              <DraggablePartChip key={part.mpn} part={part} className="max-w-[200px]" />
            ))}
          </div>
        </>
      )}

      {tab === "catalog" && (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="catalog-dropdown" className="text-xs text-muted-foreground">
              Choose part (dropdown lists the full catalog)
            </label>
            <select
              id="catalog-dropdown"
              className="w-full h-9 text-xs rounded-md border border-border bg-background px-2 font-mono"
              value={catalogPickMpn}
              onChange={(e) => setCatalogPickMpn(e.target.value)}
              disabled={listLoading || catalog.length === 0}
            >
              <option value="">— Select a part —</option>
              {catalog.map((p) => (
                <option key={p.mpn} value={p.mpn}>
                  {p.mpn} · {p.value} · {p.package}
                </option>
              ))}
            </select>
            {listLoading && <p className="text-xs text-muted-foreground">Loading catalog…</p>}
            {listError && <p className="text-xs text-destructive">{listError}</p>}
            {pickedFromDropdown && (
              <div className="flex flex-col gap-1 pt-1 border-t border-border/60">
                <span className="text-[11px] text-muted-foreground">Drag onto schematic:</span>
                <DraggablePartChip part={pickedFromDropdown} className="max-w-full" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="catalog-filter" className="text-xs text-muted-foreground">
              Or drag from list
            </label>
            <input
              id="catalog-filter"
              type="search"
              value={catalogFilter}
              onChange={(e) => setCatalogFilter(e.target.value)}
              placeholder="Filter catalog…"
              className="h-8 px-2 text-sm rounded-md border border-border bg-background"
            />
            <div className="max-h-36 overflow-y-auto flex flex-col gap-1 pr-0.5">
              {filteredCatalog.length === 0 && !listLoading && (
                <span className="text-xs text-muted-foreground py-1">
                  {catalog.length === 0 ? "No parts loaded" : "No matches for filter"}
                </span>
              )}
              {filteredCatalog.map((part) => (
                <DraggablePartChip key={part.mpn} part={part} className="w-full max-w-none" />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
