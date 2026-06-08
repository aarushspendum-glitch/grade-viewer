"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Calculator, LogOut, Calendar, Settings } from "lucide-react";
import { useUser, AvatarDisplay } from "@/contexts/UserContext";

const NAV = [
  { href: "/dashboard", label: "Grades",   icon: LayoutDashboard },
  { href: "/gpa",       label: "GPA",      icon: Calculator },
  { href: "/calendar",  label: "Calendar", icon: Calendar },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { name, avatarId } = useUser();

  const displayName = name; // only show name set in Settings

  function signOut() {
    sessionStorage.clear();
    router.push("/");
  }

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col bg-white border-r border-gray-100 py-5 px-3">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-5 px-2">
        {/* Ascending bars mark */}
        <div className="w-7 h-7 rounded-lg flex-shrink-0 overflow-hidden"
          style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}>
          <svg viewBox="0 0 28 28" width="28" height="28">
            <rect x="4"  y="17" width="5" height="7"  rx="1.5" fill="rgba(255,255,255,0.5)"/>
            <rect x="11" y="12" width="5" height="12" rx="1.5" fill="rgba(255,255,255,0.75)"/>
            <rect x="18" y="6"  width="5" height="18" rx="1.5" fill="white"/>
          </svg>
        </div>
        <span className="font-bold text-gray-900 tracking-tight">UpGrade</span>
        <span className="text-[10px] font-medium bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full ml-auto">FCPS</span>
      </div>

      {/* Avatar + name */}
      <Link href="/settings" className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors mb-3 group">
        <AvatarDisplay id={avatarId} size={34} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
            {displayName || "Student"}
          </p>
          <p className="text-[10px] text-gray-400">View profile</p>
        </div>
      </Link>

      <div className="h-px bg-gray-100 mb-3" />

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}>
              <Icon className={`w-4 h-4 ${active ? "text-indigo-600" : ""}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Settings + Sign out */}
      <div className="border-t border-gray-100 pt-3 mt-3 flex flex-col gap-0.5">
        <Link href="/settings"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname === "/settings" ? "bg-indigo-50 text-indigo-700" : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
          }`}>
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <button onClick={signOut}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-50 w-full transition-colors">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
