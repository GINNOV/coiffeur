import { describe, expect, it } from "vitest";
import { parseArchive } from "@/lib/archive";
import { DEFAULT_TEMPLATES, TEMPLATE_KEYS } from "@/lib/catalog";

const file = {
  version: 1,
  closures: { weekdays: [0, 1], dates: ["2026-12-25"] },
  services: [{ name: "Taglio", durationMinutes: 30, position: 0 }],
  templates: TEMPLATE_KEYS.map((key) => ({ key, body: DEFAULT_TEMPLATES[key] })),
  kapso: null,
  clients: [],
  appointments: [],
};

describe("archive", () => {
  it("accepts a versioned salon file and rejects a different shape", () => {
    expect(parseArchive(file)?.services[0]?.name).toBe("Taglio");
    expect(parseArchive({ ...file, version: 2 })).toBeNull();
    expect(parseArchive({ ...file, closures: { weekdays: ["dom"], dates: [] } })).toBeNull();
  });
});
