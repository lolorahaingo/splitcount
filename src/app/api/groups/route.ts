import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { generateSlug } from "@/lib/utils";

export async function POST(request: Request) {
  const { name, currency } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
  }

  const slug = generateSlug();
  const [group] = await db
    .insert(groups)
    .values({ name: name.trim(), slug, currency: currency || "EUR" })
    .returning();

  return NextResponse.json(group, { status: 201 });
}
