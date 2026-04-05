import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, members, expenses, expenseShares, expensePayers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { sanitizeString } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });

  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  const groupMembers = await db
    .select()
    .from(members)
    .where(eq(members.groupId, group.id));

  const groupExpenses = await db
    .select()
    .from(expenses)
    .where(eq(expenses.groupId, group.id))
    .orderBy(desc(expenses.createdAt));

  const expensesWithShares = await Promise.all(
    groupExpenses.map(async (expense) => {
      const [shares, payers] = await Promise.all([
        db.select().from(expenseShares).where(eq(expenseShares.expenseId, expense.id)),
        db.select().from(expensePayers).where(eq(expensePayers.expenseId, expense.id)),
      ]);
      return { ...expense, shares, payers };
    })
  );

  return NextResponse.json({
    ...group,
    members: groupMembers,
    expenses: expensesWithShares,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const name = sanitizeString(body.name, 100);
  if (!name) {
    return NextResponse.json({ error: "Le nom est requis (max 100 caractères)" }, { status: 400 });
  }

  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });

  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  const [updated] = await db
    .update(groups)
    .set({ name })
    .where(eq(groups.id, group.id))
    .returning();

  return NextResponse.json(updated);
}
