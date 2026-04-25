import type { Component, ComponentType } from "@circuitmind/circuit-ir";

const PREFIX: Record<ComponentType, string> = {
  resistor: "R",
  capacitor: "C",
  inductor: "L",
  diode: "D",
  transistor: "Q",
  ic: "U",
  voltage_regulator: "U",
  crystal: "Y",
  connector: "J",
  led: "D",
  switch: "S",
  fuse: "F",
  transformer: "T",
  opamp: "U",
  mosfet: "Q",
  bjt: "Q",
};

export function nextComponentId(components: Component[], type: ComponentType): string {
  const prefix = PREFIX[type] ?? "X";
  const re = new RegExp(`^${prefix}(\\d+)$`, "i");
  let max = 0;
  for (const c of components) {
    const m = c.id.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}${max + 1}`;
}
