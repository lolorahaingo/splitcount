import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, members, expenses, expenseShares, expensePayers } from "@/db/schema";
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

  // payers: array of { memberId, amount }
  if (!Array.isArray(body.payers) || body.payers.length === 0 || body.payers.length > 50) {
    return NextResponse.json({ error: "Payeurs invalides" }, { status: 400 });
  }
  for (const p of body.payers) {
    if (!isValidUUID(p.memberId) || !isValidAmount(p.amount)) {
      return NextResponse.json({ error: "Données de payeur invalides" }, { status: 400 });
    }
  }

  if (!Array.isArray(body.shares) || body.shares.length === 0 || body.shares.length > 50) {
    return NextResponse.json({ error: "Partage invalide" }, { status: 400 });
  }
  for (const s of body.shares) {
    if (!isValidUUID(s.memberId) || !isValidAmount(s.amount)) {
      return NextResponse.json({ error: "Données de partage invalides" }, { status: 400 });
    }
  }

  const group = await db.query.groups.findFirst({ where: eq(groups.slug, slug) });
  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  const groupMembers = await db.select().from(members).where(eq(members.groupId, group.id));
  const memberIds = new Set(groupMembers.map((m) => m.id));

  for (const p of body.payers) {
    if (!memberIds.has(p.memberId)) {
      return NextResponse.json({ error: "Un payeur n'est pas dans ce groupe" }, { status: 400 });
    }
  }
  for (const s of body.shares) {
    if (!memberIds.has(s.memberId)) {
      return NextResponse.json({ error: "Un membre du partage n'est pas dans ce groupe" }, { status: 400 });
    }
  }

  // paidBy = first payer (for legacy display)
  const [expense] = await db
    .insert(expenses)
    .values({
      title,
      amount: String(Number(body.amount)),
      paidBy: body.payers[0].memberId,
      groupId: group.id,
    })
    .returning();

  await Promise.all([
    db.insert(expensePayers).values(
      body.payers.map((p: { memberId: string; amount: number }) => ({
        expenseId: expense.id,
        memberId: p.memberId,
        amount: String(Number(p.amount)),
      }))
    ),
    db.insert(expenseShares).values(
      body.shares.map((s: { memberId: string; amount: number }) => ({
        expenseId: expense.id,
        memberId: s.memberId,
        amount: String(Number(s.amount)),
      }))
    ),
  ]);

  return NextResponse.json(expense, { status: 201 });
}
