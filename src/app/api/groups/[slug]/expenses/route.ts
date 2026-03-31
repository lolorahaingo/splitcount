import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, expenses, expenseShares } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { title, amount, paidBy, shares } = await request.json();

  if (!title?.trim() || !amount || !paidBy || !shares?.length) {
    return NextResponse.json(
      { error: "Tous les champs sont requis" },
      { status: 400 }
    );
  }

  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });

  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  const [expense] = await db
    .insert(expenses)
    .values({
      title: title.trim(),
      amount: String(amount),
      paidBy,
      groupId: group.id,
    })
    .returning();

  await db.insert(expenseShares).values(
    shares.map((s: { memberId: string; amount: number }) => ({
      expenseId: expense.id,
      memberId: s.memberId,
      amount: String(s.amount),
    }))
  );

  return NextResponse.json(expense, { status: 201 });
}
