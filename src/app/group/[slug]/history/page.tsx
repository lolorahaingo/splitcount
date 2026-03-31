"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  title: string;
  amount: string;
  paidBy: string;
  createdAt: string;
  shares: { memberId: string; amount: string }[];
}

export default function HistoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currency, setCurrency] = useState("EUR");
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  useEffect(() => {
    const cookieKey = `splitcount_member_${slug}`;
    const savedMemberId = document.cookie
      .split("; ")
      .find((c) => c.startsWith(cookieKey + "="))
      ?.split("=")[1];
    setCurrentMemberId(savedMemberId || null);

    fetch(`/api/groups/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setExpenses(data.expenses);
        setMembers(data.members);
        setCurrency(data.currency);
      });
  }, [slug]);

  function getMemberName(id: string) {
    return members.find((m) => m.id === id)?.name || "?";
  }

  async function handleDelete(expenseId: string) {
    if (!confirm("Supprimer cette dépense ?")) return;
    await fetch(`/api/groups/${slug}/expenses/${expenseId}`, {
      method: "DELETE",
    });
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
  }

  return (
    <main className="flex-1 max-w-lg mx-auto w-full p-4">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push(`/group/${slug}`)}
          className="text-gray-500 hover:text-gray-700"
        >
          &larr;
        </button>
        <h1 className="text-xl font-bold text-gray-900">Historique</h1>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-400">Aucune dépense</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => {
            const payer = getMemberName(expense.paidBy);
            const involvedMembers = expense.shares
              .map((s) => getMemberName(s.memberId))
              .join(", ");

            return (
              <div
                key={expense.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {expense.title}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {new Date(expense.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(Number(expense.amount), currency)}
                    </span>
                    {expense.paidBy === currentMemberId && (
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p>
                    Payé par <span className="font-medium">{payer}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Partagé entre : {involvedMembers}
                  </p>
                  <div className="mt-2 space-y-1">
                    {expense.shares.map((s) => (
                      <div
                        key={s.memberId}
                        className="flex justify-between text-xs text-gray-500"
                      >
                        <span>{getMemberName(s.memberId)}</span>
                        <span>{formatCurrency(Number(s.amount), currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
