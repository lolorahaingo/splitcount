import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, members, expenses, expenseShares } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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
      const shares = await db
        .select()
        .from(expenseShares)
        .where(eq(expenseShares.expenseId, expense.id));
      return { ...expense, shares };
    })
  );

  return NextResponse.json({
    ...group,
    members: groupMembers,
    expenses: expensesWithShares,
  });
}
