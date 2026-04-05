export interface MemberBalance {
  memberId: string;
  memberName: string;
  balance: number; // positive = is owed money, negative = owes money
}

export interface Settlement {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

export function calculateBalances(
  members: { id: string; name: string }[],
  expenses: {
    paidBy: string; // legacy fallback
    payers: { memberId: string; amount: number }[];
    shares: { memberId: string; amount: number }[];
  }[]
): MemberBalance[] {
  const balanceMap = new Map<string, number>();

  for (const m of members) {
    balanceMap.set(m.id, 0);
  }

  for (const expense of expenses) {
    // Credit each payer for what they paid
    const payers = expense.payers.length > 0
      ? expense.payers
      : [{ memberId: expense.paidBy, amount: expense.shares.reduce((s, sh) => s + sh.amount, 0) }];

    for (const payer of payers) {
      balanceMap.set(
        payer.memberId,
        (balanceMap.get(payer.memberId) || 0) + payer.amount
      );
    }

    // Debit each person for their share
    for (const share of expense.shares) {
      balanceMap.set(
        share.memberId,
        (balanceMap.get(share.memberId) || 0) - share.amount
      );
    }
  }

  return members.map((m) => ({
    memberId: m.id,
    memberName: m.name,
    balance: Math.round((balanceMap.get(m.id) || 0) * 100) / 100,
  }));
}

export function simplifyDebts(balances: MemberBalance[]): Settlement[] {
  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .map((b) => ({ ...b, balance: Math.abs(b.balance) }))
    .sort((a, b) => b.balance - a.balance);

  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .sort((a, b) => b.balance - a.balance);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].balance, creditors[j].balance);
    if (amount > 0.01) {
      settlements.push({
        from: debtors[i].memberId,
        fromName: debtors[i].memberName,
        to: creditors[j].memberId,
        toName: creditors[j].memberName,
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtors[i].balance -= amount;
    creditors[j].balance -= amount;

    if (debtors[i].balance < 0.01) i++;
    if (creditors[j].balance < 0.01) j++;
  }

  return settlements;
}
