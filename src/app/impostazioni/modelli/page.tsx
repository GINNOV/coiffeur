import { TemplatesForm } from "@/components/admin-forms";
import { isTemplateKey, type TemplateKey } from "@/lib/catalog";
import { requireSalon } from "@/server/auth";
import { ensureTemplates } from "@/server/catalog";

export const dynamic = "force-dynamic";

export default async function ModelliPage() {
  const salon = await requireSalon();
  const templates = await ensureTemplates(salon.id);
  const initial = templates.flatMap((template) =>
    isTemplateKey(template.key) ? [{ key: template.key, body: template.body }] : [],
  ) satisfies { key: TemplateKey; body: string }[];
  return <TemplatesForm initial={initial} />;
}
