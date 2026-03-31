import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { generateSlug } from "@/lib/utils";
import { sanitizeString, isValidCurrency } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const name = sanitizeString(body.name, 100);
  if (!name) {
    return NextResponse.json({ error: "Le nom est requis (max 100 caractères)" }, { status: 400 });
  }

  const currency = isValidCurrency(body.currency) ? body.currency : "EUR";

  const slug = generateSlug();
  const [group] = await db
    .insert(groups)
    .values({ name, slug, currency })
    .returning();

  return NextResponse.json(group, { status: 201 });
}
