"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import {
  calculateBalances,
  simplifyDebts,
  type Settlement,
  type MemberBalance,
} from "@/lib/balance";

interface Member {
  id: string;
  name: string;
}

interface ExpenseShare {
  memberId: string;
  amount: string;
}

interface Expense {
  id: string;
  title: string;
  amount: string;
  paidBy: string;
  createdAt: string;
  shares: ExpenseShare[];
}

interface GroupData {
  id: string;
  name: string;
  slug: string;
  currency: string;
  members: Member[];
  expenses: Expense[];
}

export default function GroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [group, setGroup] = useState<GroupData | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [balances, setBalances] = useState<MemberBalance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [copied, setCopied] = useState(false);

  const loadGroup = useCallback(async () => {
    const res = await fetch(`/api/groups/${slug}`);
    if (!res.ok) return;
    const data: GroupData = await res.json();
    setGroup(data);

    const expensesForCalc = data.expenses.map((e) => ({
      paidBy: e.paidBy,
      shares: e.shares.map((s) => ({
        memberId: s.memberId,
        amount: Number(s.amount),
      })),
    }));

    const bal = calculateBalances(data.members, expensesForCalc);
    setBalances(bal);
    setSettlements(simplifyDebts(bal));
  }, [slug]);

  useEffect(() => {
    const cookieKey = `splitcount_member_${slug}`;
    const savedMemberId = document.cookie
      .split("; ")
      .find((c) => c.startsWith(cookieKey + "="))
      ?.split("=")[1];

    if (!savedMemberId) {
      router.push(`/group/${slug}/join`);
      return;
    }
    setCurrentMemberId(savedMemberId);
    loadGroup();
  }, [slug, router, loadGroup]);

  async function handleDeleteExpense(expenseId: string) {
    if (!confirm("Supprimer cette dépense ?")) return;
    await fetch(`/api/groups/${slug}/expenses/${expenseId}`, {
      method: "DELETE",
    });
    loadGroup();
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.origin + `/group/${slug}/join`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!group) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">Chargement...</p>
      </main>
    );
  }

  const currentMember = group.members.find((m) => m.id === currentMemberId);
  const totalExpenses = group.expenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  return (
    <main className="flex-1 max-w-lg mx-auto w-full p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          <p className="text-sm text-gray-500">
            Connecté en tant que{" "}
            <span className="font-medium text-gray-700">
              {currentMember?.name}
            </span>
          </p>
        </div>
        <button
          onClick={handleCopyLink}
          className="text-sm px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
        >
          {copied ? "Copié !" : "Inviter"}
        </button>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-500">Total des dépenses</span>
          <span className="text-xl font-bold text-gray-900">
            {formatCurrency(totalExpenses, group.currency)}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {group.members.length} membre{group.members.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* Balances */}
      {balances.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Soldes</h2>
          <div className="space-y-2">
            {balances.map((b) => (
              <div key={b.memberId} className="flex justify-between items-center">
                <span className="text-gray-900">{b.memberName}</span>
                <span
                  className={`font-medium ${
                    b.balance > 0
                      ? "text-green-600"
                      : b.balance < 0
                        ? "text-red-600"
                        : "text-gray-400"
                  }`}
                >
                  {b.balance > 0 ? "+" : ""}
                  {formatCurrency(b.balance, group.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settlements */}
      {settlements.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Qui doit quoi ?
          </h2>
          <div className="space-y-2">
            {settlements.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <span className="font-medium">{s.fromName}</span>
                <span className="text-gray-400">doit</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(s.amount, group.currency)}
                </span>
                <span className="text-gray-400">à</span>
                <span className="font-medium">{s.toName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent expenses */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-medium text-gray-700">
            Dernières dépenses
          </h2>
          <Link
            href={`/group/${slug}/history`}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Tout voir
          </Link>
        </div>
        {group.expenses.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            Aucune dépense pour le moment
          </p>
        ) : (
          <div className="space-y-3">
            {group.expenses.slice(0, 5).map((expense) => {
              const payer = group.members.find((m) => m.id === expense.paidBy);
              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-gray-900 font-medium">{expense.title}</p>
                    <p className="text-xs text-gray-500">
                      Payé par {payer?.name} &middot;{" "}
                      {new Date(expense.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {formatCurrency(Number(expense.amount), group.currency)}
                    </span>
                    {expense.paidBy === currentMemberId && (
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-gray-400 hover:text-red-500 text-xs"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB - Add expense */}
      <Link
        href={`/group/${slug}/expense/new`}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-colors"
      >
        +
      </Link>
    </main>
  );
}
