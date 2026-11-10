export type ClientRecord = {
  id: string;
  name: string;
  phone: string;
  phoneDigits: string;
  note: string;
  lastVisitDate: string | null;
};

export function phoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // +39 333… and 333… are the same Italian number.
  if (digits.startsWith("39") && digits.length > 10) return digits.slice(2);
  return digits;
}

export function phonesMatch(a: string, b: string): boolean {
  const left = phoneDigits(a);
  const right = phoneDigits(b);
  if (!left || !right) return false;
  return left === right;
}

export function searchClients(clients: ClientRecord[], query: string): ClientRecord[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const needle = trimmed.toLowerCase();
  const digits = phoneDigits(trimmed);
  const rawDigits = trimmed.replace(/\D/g, "");
  return clients
    .filter((client) => {
      const nameHit = client.name.toLowerCase().includes(needle);
      const phoneHit =
        (digits.length > 0 && client.phoneDigits.includes(digits)) ||
        (rawDigits.length > 0 && rawDigits !== digits && client.phoneDigits.includes(rawDigits));
      return nameHit || phoneHit;
    })
    .slice(0, 8);
}

export type VisitClientPlan =
  | { kind: "none" }
  | { kind: "keep"; clientId: string }
  | { kind: "phone_taken"; existingId: string }
  | { kind: "create"; name: string; phone: string; phoneDigits: string };

export function resolveVisitClient(input: {
  name: string;
  phone: string;
  attachedClientId: string | null;
  clients: Pick<ClientRecord, "id" | "name" | "phoneDigits">[];
}): VisitClientPlan {
  const name = input.name.trim();
  if (!name) return { kind: "none" };
  if (input.attachedClientId) return { kind: "keep", clientId: input.attachedClientId };
  const digits = phoneDigits(input.phone);
  if (digits) {
    const match = input.clients.find((client) => client.phoneDigits === digits);
    if (match) return { kind: "phone_taken", existingId: match.id };
  }
  return {
    kind: "create",
    name,
    phone: input.phone.trim(),
    phoneDigits: digits,
  };
}

export function cardsAfterCreate<T>(clients: T[], plan: VisitClientPlan, created: T): T[] {
  if (plan.kind !== "create") return clients;
  return [...clients, created];
}

export function updateClientPhone(
  clients: Pick<ClientRecord, "id" | "phoneDigits">[],
  clientId: string,
  phone: string,
): { ok: true; phone: string; phoneDigits: string } | { ok: false; code: "phone_taken" } {
  const digits = phoneDigits(phone);
  if (digits) {
    const taken = clients.some((client) => client.id !== clientId && client.phoneDigits === digits);
    if (taken) return { ok: false, code: "phone_taken" };
  }
  return { ok: true, phone: phone.trim(), phoneDigits: digits };
}

export function applyClientNote<T extends { clientId: string | null }>(
  client: { id: string; note: string },
  note: string,
  appointment: T,
): { client: { id: string; note: string }; appointment: T } {
  return {
    client: { id: client.id, note },
    appointment: { ...appointment },
  };
}
