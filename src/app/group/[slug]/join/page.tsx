"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [name, setName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [existingMembers, setExistingMembers] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/groups/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setGroupName(data.name);
        setExistingMembers(data.members || []);

        // Check if user already has a cookie for this group
        const cookieKey = `splitcount_member_${slug}`;
        const savedMemberId = document.cookie
          .split("; ")
          .find((c) => c.startsWith(cookieKey + "="))
          ?.split("=")[1];

        if (savedMemberId) {
          router.push(`/group/${slug}`);
        }
      });
  }, [slug, router]);

  async function handleJoinNew(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const res = await fetch(`/api/groups/${slug}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (res.ok) {
      const member = await res.json();
      // Save member ID in cookie (30 days)
      document.cookie = `splitcount_member_${slug}=${member.id}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax; Secure`;
      router.push(`/group/${slug}`);
    }
    setLoading(false);
  }

  function handleSelectExisting(memberId: string) {
    document.cookie = `splitcount_member_${slug}=${memberId}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax; Secure`;
    router.push(`/group/${slug}`);
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Rejoindre {groupName}
          </h1>
          <p className="text-gray-500">Qui êtes-vous ?</p>
        </div>

        {existingMembers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-4">
            <h2 className="text-sm font-medium text-gray-700 mb-3">
              Membres existants
            </h2>
            <div className="space-y-2">
              {existingMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectExisting(m.id)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-gray-900"
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={handleJoinNew}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4"
        >
          <h2 className="text-sm font-medium text-gray-700">
            {existingMembers.length > 0
              ? "Ou créer un nouveau profil"
              : "Entrez votre nom"}
          </h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre prénom"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Rejoindre"}
          </button>
        </form>
      </div>
    </main>
  );
}
