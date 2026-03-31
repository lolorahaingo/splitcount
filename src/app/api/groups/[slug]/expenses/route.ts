import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, members, expenses, expenseShares } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sanitizeString, isValidAmount, isValidUUID } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const title = sanitizeString(body.title, 200);
  if (!title) {
    return NextResponse.json({ error: "Titre requis (max 200 caractères)" }, { status: 400 });
  }

  if (!isValidAmount(body.amount)) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  if (!isValidUUID(body.paidBy)) {
    return NextResponse.json({ error: "Payeur invalide" }, { status: 400 });
  }

  if (!Array.isArray(body.shares) || body.shares.length === 0 || body.shares.length > 50) {
    return NextResponse.json({ error: "Partage invalide" }, { status: 400 });
  }

  // Validate each share
  for (const s of body.shares) {
    if (!isValidUUID(s.memberId) || !isValidAmount(s.amount)) {
      return NextResponse.json({ error: "Données de partage invalides" }, { status: 400 });
    }
  }

  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });

  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  // Verify paidBy member belongs to this group
  const groupMembers = await db
    .select()
    .from(members)
    .where(eq(members.groupId, group.id));

  const memberIds = new Set(groupMembers.map((m) => m.id));

  if (!memberIds.has(body.paidBy)) {
    return NextResponse.json({ error: "Le payeur n'est pas dans ce groupe" }, { status: 400 });
  }

  // Verify all share members belong to this group
  for (const s of body.shares) {
    if (!memberIds.has(s.memberId)) {
      return NextResponse.json({ error: "Un membre du partage n'est pas dans ce groupe" }, { status: 400 });
    }
  }

  const amount = Number(body.amount);

  const [expense] = await db
    .insert(expenses)
    .values({
      title,
      amount: String(amount),
      paidBy: body.paidBy,
      groupId: group.id,
    })
    .returning();

  await db.insert(expenseShares).values(
    body.shares.map((s: { memberId: string; amount: number }) => ({
      expenseId: expense.id,
      memberId: s.memberId,
      amount: String(Number(s.amount)),
    }))
  );

  return NextResponse.json(expense, { status: 201 });
}
