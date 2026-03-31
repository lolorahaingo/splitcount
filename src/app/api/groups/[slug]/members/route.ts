import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sanitizeString } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const name = sanitizeString(body.name, 50);
  if (!name) {
    return NextResponse.json({ error: "Le nom est requis (max 50 caractères)" }, { status: 400 });
  }

  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });

  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  // Limit members per group to prevent abuse
  const existingMembers = await db
    .select()
    .from(members)
    .where(eq(members.groupId, group.id));

  if (existingMembers.length >= 50) {
    return NextResponse.json(
      { error: "Nombre maximum de membres atteint (50)" },
      { status: 400 }
    );
  }

  const [member] = await db
    .insert(members)
    .values({ name, groupId: group.id })
    .returning();

  return NextResponse.json(member, { status: 201 });
}
