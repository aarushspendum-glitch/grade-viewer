"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { useUser, AVATARS, THEMES, AvatarDisplay, type AvatarId, type ThemeId } from "@/contexts/UserContext";

export default function SettingsPage() {
  const { name, setName, avatarId, setAvatarId, themeId, setThemeId } = useUser();
  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState(name);
  const [saved,       setSaved]       = useState(false);

  function saveName() {
    setName(nameInput.trim());
    setEditingName(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Personalize your UpGrade experience</p>
      </div>

      {/* ── Profile ── */}
      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-5">
        <h2 className="font-semibold text-gray-900 mb-5">Profile</h2>

        {/* Current avatar preview + name */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
          <AvatarDisplay id={avatarId} size={56} />
          <div>
            <p className="font-semibold text-gray-900 text-lg">{name || "Student"}</p>
            <p className="text-sm text-gray-400">FCPS StudentVUE</p>
          </div>
          {saved && (
            <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>

        {/* Display name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Display name</label>
          {editingName ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                placeholder="Your name"
                maxLength={32}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button onClick={saveName}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                Save
              </button>
              <button onClick={() => setEditingName(false)}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => { setNameInput(name); setEditingName(true); }}
              className="flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors w-full text-left">
              <span className="flex-1">{name || <span className="text-gray-400">Add your name…</span>}</span>
              <Pencil className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Avatar picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Avatar</label>
          <div className="grid grid-cols-5 gap-3">
            {AVATARS.map(av => {
              const selected = avatarId === av.id;
              return (
                <button key={av.id} onClick={() => setAvatarId(av.id as AvatarId)}
                  title={av.name}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                    selected ? "ring-2 ring-indigo-500 ring-offset-2 bg-indigo-50" : "hover:bg-gray-50"
                  }`}>
                  <AvatarDisplay id={av.id as AvatarId} size={44} />
                  <span className={`text-[11px] font-medium ${selected ? "text-indigo-600" : "text-gray-400"}`}>
                    {av.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Appearance ── */}
      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-5">
        <h2 className="font-semibold text-gray-900 mb-1">Theme color</h2>
        <p className="text-sm text-gray-400 mb-5">Changes the accent color across the whole app</p>

        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(THEMES) as [ThemeId, typeof THEMES[ThemeId]][]).map(([id, theme]) => {
            const selected = themeId === id;
            return (
              <button key={id} onClick={() => setThemeId(id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                  selected
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                }`}>
                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: theme.swatch }}>
                  {selected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={`text-sm font-medium ${selected ? "text-indigo-700" : "text-gray-700"}`}>
                  {theme.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── About ── */}
      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">About UpGrade</h2>
        <div className="flex flex-col gap-2 text-sm text-gray-500">
          <div className="flex justify-between">
            <span>School</span>
            <span className="font-medium text-gray-700">Fairfax County Public Schools</span>
          </div>
          <div className="flex justify-between">
            <span>GPA Scale</span>
            <span className="font-medium text-gray-700">FCPS True Plus/Minus</span>
          </div>
          <div className="flex justify-between">
            <span>Data source</span>
            <span className="font-medium text-gray-700">StudentVUE · Schoology iCal</span>
          </div>
          <div className="flex justify-between">
            <span>Privacy</span>
            <span className="font-medium text-gray-700">Credentials never stored server-side</span>
          </div>
        </div>
      </section>
    </div>
  );
}
