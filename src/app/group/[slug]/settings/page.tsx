"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

interface Member {
  id: string;
  name: string;
}

export default function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/groups/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setGroupName(data.name);
        setMembers(data.members);
      });
  }, [slug]);

  async function handleSaveGroupName() {
    if (!groupName.trim()) return;
    setSaving(true);
    await fetch(`/api/groups/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: groupName }),
    });
    setSaving(false);
  }

  async function handleSaveMemberName(memberId: string) {
    if (!editName.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/groups/${slug}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, name: editName.trim() } : m
        )
      );
      setEditingMember(null);
    }
    setSaving(false);
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
        <h1 className="text-xl font-bold text-gray-900">Paramètres</h1>
      </div>

      {/* Group name */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">
          Nom du groupe
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
          />
          <button
            onClick={handleSaveGroupName}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? "..." : "Enregistrer"}
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-700">Membres</h2>
          {!addingMember && (
            <button
              onClick={() => setAddingMember(true)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + Ajouter
            </button>
          )}
        </div>

        {addingMember && (
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Nom du nouveau membre"
              className="flex-1 px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 text-sm"
              autoFocus
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  if (!newMemberName.trim()) return;
                  const res = await fetch(`/api/groups/${slug}/members`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: newMemberName }),
                  });
                  if (res.ok) {
                    const member = await res.json();
                    setMembers((prev) => [...prev, member]);
                    setNewMemberName("");
                    setAddingMember(false);
                  }
                }
                if (e.key === "Escape") {
                  setAddingMember(false);
                  setNewMemberName("");
                }
              }}
            />
            <button
              onClick={async () => {
                if (!newMemberName.trim()) return;
                const res = await fetch(`/api/groups/${slug}/members`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: newMemberName }),
                });
                if (res.ok) {
                  const member = await res.json();
                  setMembers((prev) => [...prev, member]);
                  setNewMemberName("");
                  setAddingMember(false);
                }
              }}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm"
            >
              OK
            </button>
            <button
              onClick={() => {
                setAddingMember(false);
                setNewMemberName("");
              }}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm"
            >
              Annuler
            </button>
          </div>
        )}

        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id}>
              {editingMember === m.id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveMemberName(m.id);
                      if (e.key === "Escape") setEditingMember(null);
                    }}
                  />
                  <button
                    onClick={() => handleSaveMemberName(m.id)}
                    disabled={saving}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm disabled:opacity-50"
                  >
                    OK
                  </button>
                  <button
                    onClick={() => setEditingMember(null)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200">
                  <span className="text-gray-900">{m.name}</span>
                  <button
                    onClick={() => {
                      setEditingMember(m.id);
                      setEditName(m.name);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Modifier
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
