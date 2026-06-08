"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

// ── Avatar presets ────────────────────────────────────────────────────────────
export const AVATARS = [
  { id: "lion",     emoji: "🦁", from: "#F59E0B", to: "#D97706", name: "Lion" },
  { id: "dolphin",  emoji: "🐬", from: "#3B82F6", to: "#1D4ED8", name: "Dolphin" },
  { id: "blossom",  emoji: "🌸", from: "#EC4899", to: "#9D174D", name: "Blossom" },
  { id: "bolt",     emoji: "⚡", from: "#FBBF24", to: "#B45309", name: "Bolt" },
  { id: "butterfly",emoji: "🦋", from: "#8B5CF6", to: "#5B21B6", name: "Butterfly" },
  { id: "leaf",     emoji: "🌿", from: "#10B981", to: "#065F46", name: "Leaf" },
  { id: "fire",     emoji: "🔥", from: "#EF4444", to: "#991B1B", name: "Fire" },
  { id: "moon",     emoji: "🌙", from: "#6366F1", to: "#1E1B4B", name: "Moon" },
  { id: "wave",     emoji: "🌊", from: "#06B6D4", to: "#0E7490", name: "Wave" },
  { id: "star",     emoji: "⭐", from: "#F97316", to: "#9A3412", name: "Star" },
] as const;
export type AvatarId = (typeof AVATARS)[number]["id"];

// ── Color themes ──────────────────────────────────────────────────────────────
export const THEMES = {
  indigo:  { name: "Indigo",  swatch: "#4F46E5", css: null },
  violet:  { name: "Violet",  swatch: "#7C3AED", css: buildCss("violet",  "#f5f3ff","#ede9fe","#ddd6fe","#a78bfa","#8b5cf6","#7c3aed","#6d28d9","#5b21b6") },
  blue:    { name: "Blue",    swatch: "#2563EB", css: buildCss("blue",    "#eff6ff","#dbeafe","#bfdbfe","#60a5fa","#3b82f6","#2563eb","#1d4ed8","#1e40af") },
  emerald: { name: "Emerald", swatch: "#059669", css: buildCss("emerald", "#ecfdf5","#d1fae5","#a7f3d0","#34d399","#10b981","#059669","#047857","#065f46") },
  rose:    { name: "Rose",    swatch: "#E11D48", css: buildCss("rose",    "#fff1f2","#ffe4e6","#fecdd3","#fb7185","#f43f5e","#e11d48","#be123c","#9f1239") },
  amber:   { name: "Amber",   swatch: "#D97706", css: buildCss("amber",   "#fffbeb","#fef3c7","#fde68a","#fbbf24","#f59e0b","#d97706","#b45309","#92400e") },
} as const;
export type ThemeId = keyof typeof THEMES;

function buildCss(
  _id: string,
  c50: string, c100: string, c200: string, c400: string,
  c500: string, c600: string, c700: string, c800: string
): string {
  return [
    `.bg-indigo-50{background-color:${c50}!important}`,
    `.bg-indigo-100{background-color:${c100}!important}`,
    `.bg-indigo-200{background-color:${c200}!important}`,
    `.bg-indigo-600{background-color:${c600}!important}`,
    `.bg-indigo-700{background-color:${c700}!important}`,
    `.text-indigo-400{color:${c400}!important}`,
    `.text-indigo-500{color:${c500}!important}`,
    `.text-indigo-600{color:${c600}!important}`,
    `.text-indigo-700{color:${c700}!important}`,
    `.text-indigo-800{color:${c800}!important}`,
    `.border-indigo-100{border-color:${c100}!important}`,
    `.border-indigo-200{border-color:${c200}!important}`,
    `.border-indigo-600{border-color:${c600}!important}`,
    `.ring-indigo-400{--tw-ring-color:${c400}!important}`,
    `.ring-indigo-500{--tw-ring-color:${c500}!important}`,
    `.hover\\:bg-indigo-50:hover{background-color:${c50}!important}`,
    `.hover\\:bg-indigo-100:hover{background-color:${c100}!important}`,
    `.hover\\:bg-indigo-700:hover{background-color:${c700}!important}`,
    `.focus\\:ring-indigo-400:focus{--tw-ring-color:${c400}!important}`,
    `.focus\\:ring-indigo-500:focus{--tw-ring-color:${c500}!important}`,
    `.accent-indigo-600{accent-color:${c600}!important}`,
  ].join("\n");
}

// ── Context ───────────────────────────────────────────────────────────────────
interface UserCtx {
  name: string;       setName: (v: string) => void;
  avatarId: AvatarId; setAvatarId: (v: AvatarId) => void;
  themeId: ThemeId;   setThemeId: (v: ThemeId) => void;
}

const Ctx = createContext<UserCtx>({
  name: "", setName: () => {},
  avatarId: "lion", setAvatarId: () => {},
  themeId: "indigo", setThemeId: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [name,     setNameRaw]     = useState("");
  const [avatarId, setAvatarIdRaw] = useState<AvatarId>("lion");
  const [themeId,  setThemeIdRaw]  = useState<ThemeId>("indigo");
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    setNameRaw(localStorage.getItem("upgrade_name") ?? "");
    setAvatarIdRaw((localStorage.getItem("upgrade_avatar") as AvatarId) ?? "lion");
    setThemeIdRaw((localStorage.getItem("upgrade_theme") as ThemeId) ?? "indigo");
  }, []);

  // Inject theme CSS
  const applyTheme = useCallback((id: ThemeId) => {
    if (!styleRef.current) {
      const el = document.createElement("style");
      el.id = "upgrade-theme";
      document.head.appendChild(el);
      styleRef.current = el;
    }
    styleRef.current.textContent = THEMES[id].css ?? "";
  }, []);

  useEffect(() => { applyTheme(themeId); }, [themeId, applyTheme]);

  function setName(v: string)         { setNameRaw(v);     localStorage.setItem("upgrade_name",   v); }
  function setAvatarId(v: AvatarId)   { setAvatarIdRaw(v); localStorage.setItem("upgrade_avatar", v); }
  function setThemeId(v: ThemeId)     { setThemeIdRaw(v);  localStorage.setItem("upgrade_theme",  v); applyTheme(v); }

  return (
    <Ctx.Provider value={{ name, setName, avatarId, setAvatarId, themeId, setThemeId }}>
      {children}
    </Ctx.Provider>
  );
}

export function useUser() { return useContext(Ctx); }

// ── Avatar component ──────────────────────────────────────────────────────────
export function AvatarDisplay({ id, size = 32 }: { id: AvatarId; size?: number }) {
  const av = AVATARS.find(a => a.id === id) ?? AVATARS[0];
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2, flexShrink: 0,
      background: `linear-gradient(135deg, ${av.from}, ${av.to})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.52,
    }}>
      {av.emoji}
    </div>
  );
}
