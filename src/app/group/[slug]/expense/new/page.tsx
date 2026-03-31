"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
}

export default function NewExpensePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    {}
  );
  const [currency, setCurrency] = useState("EUR");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/groups/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.members);
        setCurrency(data.currency);
        const allIds = new Set<string>(data.members.map((m: Member) => m.id));
        setSelectedMembers(allIds);

        const cookieKey = `splitcount_member_${slug}`;
        const savedMemberId = document.cookie
          .split("; ")
          .find((c) => c.startsWith(cookieKey + "="))
          ?.split("=")[1];

        if (savedMemberId) {
          setPaidBy(savedMemberId);
        }
      });
  }, [slug]);

  function toggleMember(id: string) {
    const next = new Set(selectedMembers);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedMembers(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !amount || !paidBy || selectedMembers.size === 0)
      return;

    setLoading(true);
    const totalAmount = parseFloat(amount);

    let shares: { memberId: string; amount: number }[];

    if (splitMode === "equal") {
      const perPerson = Math.round((totalAmount / selectedMembers.size) * 100) / 100;
      const memberIds = Array.from(selectedMembers);
      shares = memberIds.map((memberId, i) => ({
        memberId,
        // Last person gets the rounding remainder
        amount:
          i === memberIds.length - 1
            ? Math.round((totalAmount - perPerson * (memberIds.length - 1)) * 100) / 100
            : perPerson,
      }));
    } else {
      shares = Array.from(selectedMembers).map((memberId) => ({
        memberId,
        amount: parseFloat(customAmounts[memberId] || "0"),
      }));
    }

    const res = await fetch(`/api/groups/${slug}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, amount: totalAmount, paidBy, shares }),
    });

    if (res.ok) {
      router.push(`/group/${slug}`);
    }
    setLoading(false);
  }

  const totalAmount = parseFloat(amount) || 0;
  const perPerson =
    selectedMembers.size > 0
      ? Math.round((totalAmount / selectedMembers.size) * 100) / 100
      : 0;

  return (
    <main className="flex-1 max-w-lg mx-auto w-full p-4">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700"
        >
          &larr;
        </button>
        <h1 className="text-xl font-bold text-gray-900">Nouvelle dépense</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Restaurant, Courses..."
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Montant
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payé par
          </label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
            required
          >
            <option value="">Choisir...</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Partagé entre
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSplitMode("equal")}
                className={`text-xs px-3 py-1 rounded-full ${
                  splitMode === "equal"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                Égal
              </button>
              <button
                type="button"
                onClick={() => setSplitMode("custom")}
                className={`text-xs px-3 py-1 rounded-full ${
                  splitMode === "custom"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                Personnalisé
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2"
              >
                <label className="flex items-center gap-2 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMembers.has(m.id)}
                    onChange={() => toggleMember(m.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-900">{m.name}</span>
                </label>
                {splitMode === "equal" ? (
                  <span className="text-sm text-gray-500">
                    {selectedMembers.has(m.id)
                      ? formatCurrency(perPerson, currency)
                      : "-"}
                  </span>
                ) : (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customAmounts[m.id] || ""}
                    onChange={(e) =>
                      setCustomAmounts({
                        ...customAmounts,
                        [m.id]: e.target.value,
                      })
                    }
                    disabled={!selectedMembers.has(m.id)}
                    placeholder="0,00"
                    className="w-24 px-2 py-1 rounded-lg border border-gray-300 text-sm text-right text-gray-900 disabled:opacity-50"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? "Ajout..." : "Ajouter la dépense"}
        </button>
      </form>
    </main>
  );
}
