import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, expenseShares } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; expenseId: string }> }
) {
  const { expenseId } = await params;

  await db.delete(expenseShares).where(eq(expenseShares.expenseId, expenseId));
  await db.delete(expenses).where(eq(expenses.id, expenseId));

  return NextResponse.json({ ok: true });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string; expenseId: string }> }
) {
  const { expenseId } = await params;
  const { title, amount, paidBy, shares } = await request.json();

  await db
    .update(expenses)
    .set({
      title: title.trim(),
      amount: String(amount),
      paidBy,
      updatedAt: new Date(),
    })
    .where(eq(expenses.id, expenseId));

  // Replace shares
  await db.delete(expenseShares).where(eq(expenseShares.expenseId, expenseId));
  await db.insert(expenseShares).values(
    shares.map((s: { memberId: string; amount: number }) => ({
      expenseId,
      memberId: s.memberId,
      amount: String(s.amount),
    }))
  );

  return NextResponse.json({ ok: true });
}
