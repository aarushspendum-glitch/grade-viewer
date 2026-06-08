"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Calculator, Edit3, LogOut, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/gpa", label: "GPA Calculator", icon: Calculator },
  { href: "/what-if", label: "What-If", icon: Edit3 },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800 py-6 px-4">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="bg-violet-500/20 rounded-lg p-1.5">
          <GraduationCap className="w-5 h-5 text-violet-400" />
        </div>
        <span className="font-bold text-white text-lg">GradeView</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-violet-600/20 text-violet-300 border border-violet-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 pt-4 mt-4">
        <p className="text-xs text-slate-500 px-3 mb-3 truncate">{userEmail}</p>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
