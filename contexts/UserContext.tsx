"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

// ── Avatar presets — original SVG designs ─────────────────────────────────────
export const AVATARS = [
  {
    id: "aurora", name: "Aurora",
    from: "#6366F1", to: "#06B6D4",
    svg: `<g stroke="white" fill="none" stroke-width="2.5" stroke-linecap="round">
      <path d="M5 10 Q12 6 18 10 Q24 14 31 10"/>
      <path d="M5 18 Q12 14 18 18 Q24 22 31 18"/>
      <path d="M5 26 Q12 22 18 26 Q24 30 31 26"/>
    </g>`,
  },
  {
    id: "prism", name: "Prism",
    from: "#3B82F6", to: "#6D28D9",
    svg: `<g>
      <polygon points="18,4 32,30 4,30" stroke="white" fill="none" stroke-width="2.5" stroke-linejoin="round"/>
      <line x1="18" y1="30" x2="18" y2="17" stroke="white" stroke-width="1.5" stroke-dasharray="2 2"/>
    </g>`,
  },
  {
    id: "orbit", name: "Orbit",
    from: "#1D4ED8", to: "#0F172A",
    svg: `<g>
      <circle cx="18" cy="18" r="5" fill="white"/>
      <ellipse cx="18" cy="18" rx="13" ry="5.5" stroke="white" fill="none" stroke-width="2" transform="rotate(-30 18 18)"/>
    </g>`,
  },
  {
    id: "spark", name: "Spark",
    from: "#F59E0B", to: "#EA580C",
    svg: `<path d="M18 3 L20.5 14.5 L32 18 L20.5 21.5 L18 33 L15.5 21.5 L4 18 L15.5 14.5 Z" fill="white"/>`,
  },
  {
    id: "nova", name: "Nova",
    from: "#DC2626", to: "#7C3AED",
    svg: `<g stroke="white" stroke-linecap="round" fill="none">
      <line x1="18" y1="4"  x2="18" y2="11" stroke-width="2.5"/>
      <line x1="18" y1="25" x2="18" y2="32" stroke-width="2.5"/>
      <line x1="4"  y1="18" x2="11" y2="18" stroke-width="2.5"/>
      <line x1="25" y1="18" x2="32" y2="18" stroke-width="2.5"/>
      <line x1="7"  y1="7"  x2="13" y2="13" stroke-width="2"/>
      <line x1="23" y1="23" x2="29" y2="29" stroke-width="2"/>
      <line x1="29" y1="7"  x2="23" y2="13" stroke-width="2"/>
      <line x1="7"  y1="29" x2="13" y2="23" stroke-width="2"/>
      <circle cx="18" cy="18" r="4.5" fill="white" stroke="none"/>
    </g>`,
  },
  {
    id: "tide", name: "Tide",
    from: "#0891B2", to: "#1D4ED8",
    svg: `<g stroke="white" fill="none" stroke-linecap="round">
      <path d="M4 15 Q9.5 8 15 15 Q20.5 22 26 15 Q29 11 32 15" stroke-width="2.5"/>
      <path d="M4 22 Q9.5 15 15 22 Q20.5 29 26 22 Q29 18 32 22" stroke-width="2" opacity="0.6"/>
    </g>`,
  },
  {
    id: "ember", name: "Ember",
    from: "#EF4444", to: "#92400E",
    svg: `<path d="M18 32 C10 32 6 26 6 20 C6 13 12 8 14 4 C14 10 16 13 18 11 C18 17 23 15 24 9 C28 13 30 17 30 21 C30 27 26 32 18 32 Z" fill="white"/>`,
  },
  {
    id: "frost", name: "Frost",
    from: "#7DD3FC", to: "#1D4ED8",
    svg: `<g stroke="white" stroke-linecap="round" stroke-width="2">
      <line x1="18" y1="4"  x2="18" y2="32"/>
      <line x1="5"  y1="11" x2="31" y2="25"/>
      <line x1="5"  y1="25" x2="31" y2="11"/>
      <line x1="13" y1="6.5" x2="18" y2="4"/><line x1="23" y1="6.5" x2="18" y2="4"/>
      <line x1="13" y1="29.5" x2="18" y2="32"/><line x1="23" y1="29.5" x2="18" y2="32"/>
    </g>`,
  },
  {
    id: "eclipse", name: "Eclipse",
    from: "#4C1D95", to: "#1E1B4B",
    svg: `<g>
      <circle cx="18" cy="18" r="13" stroke="white" fill="none" stroke-width="2"/>
      <circle cx="22" cy="15" r="10" fill="#4C1D95"/>
      <circle cx="22" cy="15" r="10" stroke="white" fill="none" stroke-width="1.5" opacity="0.3"/>
    </g>`,
  },
  {
    id: "comet", name: "Comet",
    from: "#F97316", to: "#7C3AED",
    svg: `<g>
      <circle cx="23" cy="11" r="5.5" fill="white"/>
      <path d="M19 16 L7 28" stroke="white" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
      <path d="M16 15 L6 23" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
      <path d="M21 18 L12 30" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
    </g>`,
  },
] as const;
export type AvatarId = (typeof AVATARS)[number]["id"];

// ── Color themes ──────────────────────────────────────────────────────────────
export const THEMES = {
  indigo:  { name: "Indigo",  swatch: "#4F46E5", css: buildCss("#f0f0ff","#f5f3ff","#ede9fe","#ddd6fe","#a78bfa","#8b5cf6","#4F46E5","#4338CA","#3730a3") },
  violet:  { name: "Violet",  swatch: "#7C3AED", css: buildCss("#f3f0ff","#f5f3ff","#ede9fe","#ddd6fe","#a78bfa","#8b5cf6","#7c3aed","#6d28d9","#5b21b6") },
  blue:    { name: "Blue",    swatch: "#2563EB", css: buildCss("#f0f5ff","#eff6ff","#dbeafe","#bfdbfe","#60a5fa","#3b82f6","#2563eb","#1d4ed8","#1e40af") },
  emerald: { name: "Emerald", swatch: "#059669", css: buildCss("#f0fdf7","#ecfdf5","#d1fae5","#a7f3d0","#34d399","#10b981","#059669","#047857","#065f46") },
  rose:    { name: "Rose",    swatch: "#E11D48", css: buildCss("#fff0f2","#fff1f2","#ffe4e6","#fecdd3","#fb7185","#f43f5e","#e11d48","#be123c","#9f1239") },
  amber:   { name: "Amber",   swatch: "#D97706", css: buildCss("#fffbee","#fffbeb","#fef3c7","#fde68a","#fbbf24","#f59e0b","#d97706","#b45309","#92400e") },
} as const;
export type ThemeId = keyof typeof THEMES;

function buildCss(
  pageBg: string,
  c50: string, c100: string, c200: string, c400: string,
  c500: string, c600: string, c700: string, c800: string
): string {
  return [
    `body{background-color:${pageBg}!important}`,
    `.bg-gray-50{background-color:${pageBg}!important}`,
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
  avatarId: "aurora", setAvatarId: () => {},
  themeId: "indigo", setThemeId: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [name,     setNameRaw]     = useState("");
  const [avatarId, setAvatarIdRaw] = useState<AvatarId>("aurora");
  const [themeId,  setThemeIdRaw]  = useState<ThemeId>("indigo");
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    setNameRaw(localStorage.getItem("upgrade_name") ?? "");
    setAvatarIdRaw((localStorage.getItem("upgrade_avatar") as AvatarId) ?? "aurora");
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
      overflow: "hidden",
    }}>
      <svg viewBox="0 0 36 36" width={size * 0.82} height={size * 0.82}
        dangerouslySetInnerHTML={{ __html: av.svg }} />
    </div>
  );
}
