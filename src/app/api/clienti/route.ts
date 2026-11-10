import { requireApiSalon } from "@/server/auth";
import { searchDirectory } from "@/server/clients";

export async function GET(request: Request) {
  const auth = await requireApiSalon();
  if ("response" in auth) return auth.response;
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const clients = await searchDirectory(auth.salon.id, query);
  return Response.json({ clients });
}
