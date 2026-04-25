import type { Circuit, Component, Net, Wire, WireEndpoint } from "@circuitmind/circuit-ir";

function normalizeWire(raw: Record<string, unknown>): Wire | null {
  const fromRaw = raw.from ?? raw.from_endpoint;
  const toRaw = raw.to;
  if (
    !fromRaw ||
    !toRaw ||
    typeof fromRaw !== "object" ||
    typeof toRaw !== "object"
  ) {
    return null;
  }
  const from = fromRaw as WireEndpoint;
  const to = toRaw as WireEndpoint;
  const pathRaw = raw.path;
  const path =
    Array.isArray(pathRaw) && pathRaw.length > 0
      ? pathRaw.map((p) => {
          const pt = p as Record<string, unknown>;
          return { x: Number(pt.x) || 0, y: Number(pt.y) || 0 };
        })
      : undefined;
  return {
    from,
    to,
    net: String(raw.net ?? ""),
    ...(path ? { path } : {}),
  };
}

function normalizeComponent(raw: Record<string, unknown>): Component {
  const pos = (raw.position as Record<string, unknown> | undefined) ?? {};
  const pins =
    typeof raw.pins === "object" && raw.pins !== null
      ? (raw.pins as Record<string, string>)
      : {};
  const properties =
    typeof raw.properties === "object" && raw.properties !== null
      ? (raw.properties as Record<string, string>)
      : {};
  return {
    id: String(raw.id ?? "X"),
    type: (raw.type as Component["type"]) ?? "ic",
    value: String(raw.value ?? ""),
    package: String(raw.package ?? ""),
    part_number: raw.part_number != null ? String(raw.part_number) : undefined,
    position: { x: Number(pos.x) || 0, y: Number(pos.y) || 0 },
    rotation: Number(raw.rotation) || 0,
    pins,
    properties,
  };
}

function normalizeNet(raw: Record<string, unknown>): Net {
  return {
    name: String(raw.name ?? ""),
    type: (raw.type as Net["type"]) ?? "signal",
    voltage: raw.voltage != null ? Number(raw.voltage) : undefined,
  };
}

/**
 * Ensure circuit IR matches what the canvas expects (aliases, missing fields).
 * Postgres / Redis may store wires with `from_endpoint` instead of `from`.
 */
export function normalizeCircuit(input: Circuit): Circuit {
  const raw = input as unknown as Record<string, unknown>;
  const componentsIn = Array.isArray(raw.components) ? raw.components : [];
  const netsIn = Array.isArray(raw.nets) ? raw.nets : [];
  const wiresIn = Array.isArray(raw.wires) ? raw.wires : [];
  const meta = (raw.metadata as Circuit["metadata"]) ?? {
    created_at: new Date().toISOString(),
    description: "",
    tags: [],
  };

  return {
    id: String(raw.id ?? input.id),
    name: String(raw.name ?? input.name ?? "Untitled Circuit"),
    components: componentsIn.map((c) => normalizeComponent(c as Record<string, unknown>)),
    nets: netsIn.map((n) => normalizeNet(n as Record<string, unknown>)),
    wires: wiresIn
      .map((w) => normalizeWire(w as Record<string, unknown>))
      .filter((w): w is Wire => w != null),
    metadata: meta,
  };
}
