import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, members, expenses, expenseShares, expensePayers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sanitizeString, isValidAmount, isValidUUID } from "@/lib/validation";

async function getExpenseInGroup(slug: string, expenseId: string) {
  if (!isValidUUID(expenseId)) return null;

  const group = await db.query.groups.findFirst({ where: eq(groups.slug, slug) });
  if (!group) return null;

  const [expense] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.groupId, group.id)));

  return expense ? { group, expense } : null;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; expenseId: string }> }
) {
  const { slug, expenseId } = await params;

  const result = await getExpenseInGroup(slug, expenseId);
  if (!result) {
    return NextResponse.json({ error: "Dépense introuvable" }, { status: 404 });
  }

  await db.delete(expensePayers).where(eq(expensePayers.expenseId, expenseId));
  await db.delete(expenseShares).where(eq(expenseShares.expenseId, expenseId));
  await db.delete(expenses).where(eq(expenses.id, expenseId));

  return NextResponse.json({ ok: true });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string; expenseId: string }> }
) {
  const { slug, expenseId } = await params;

  const result = await getExpenseInGroup(slug, expenseId);
  if (!result) {
    return NextResponse.json({ error: "Dépense introuvable" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const title = sanitizeString(body.title, 200);
  if (!title) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  if (!isValidAmount(body.amount)) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

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

  const groupMembers = await db.select().from(members).where(eq(members.groupId, result.group.id));
  const memberIds = new Set(groupMembers.map((m) => m.id));

  for (const p of body.payers) {
    if (!memberIds.has(p.memberId)) {
      return NextResponse.json({ error: "Payeur invalide" }, { status: 400 });
    }
  }
  for (const s of body.shares) {
    if (!memberIds.has(s.memberId)) {
      return NextResponse.json({ error: "Membre du partage invalide" }, { status: 400 });
    }
  }

  await db
    .update(expenses)
    .set({
      title,
      amount: String(Number(body.amount)),
      paidBy: body.payers[0].memberId,
      updatedAt: new Date(),
    })
    .where(eq(expenses.id, expenseId));

  await db.delete(expensePayers).where(eq(expensePayers.expenseId, expenseId));
  await db.delete(expenseShares).where(eq(expenseShares.expenseId, expenseId));

  await Promise.all([
    db.insert(expensePayers).values(
      body.payers.map((p: { memberId: string; amount: number }) => ({
        expenseId,
        memberId: p.memberId,
        amount: String(Number(p.amount)),
      }))
    ),
    db.insert(expenseShares).values(
      body.shares.map((s: { memberId: string; amount: number }) => ({
        expenseId,
        memberId: s.memberId,
        amount: String(Number(s.amount)),
      }))
    ),
  ]);

  return NextResponse.json({ ok: true });
}
