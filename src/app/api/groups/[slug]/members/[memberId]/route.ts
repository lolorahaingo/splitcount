import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, members } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sanitizeString, isValidUUID } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; memberId: string }> }
) {
  const { slug, memberId } = await params;

  if (!isValidUUID(memberId)) {
    return NextResponse.json({ error: "ID membre invalide" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const name = sanitizeString(body.name, 50);
  if (!name) {
    return NextResponse.json({ error: "Le nom est requis (max 50 caractères)" }, { status: 400 });
  }

  // Verify the group exists and the member belongs to it
  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });

  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  const [existing] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.groupId, group.id)));

  if (!existing) {
    return NextResponse.json({ error: "Membre introuvable dans ce groupe" }, { status: 404 });
  }

  const [updated] = await db
    .update(members)
    .set({ name })
    .where(eq(members.id, memberId))
    .returning();

  return NextResponse.json(updated);
}
