"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Calculator, Edit3, LogOut, BookOpen } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Grades",     icon: LayoutDashboard },
  { href: "/gpa",       label: "GPA",        icon: Calculator },
  { href: "/what-if",   label: "What-If",    icon: Edit3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function signOut() {
    sessionStorage.clear();
    router.push("/");
  }

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col bg-white border-r border-gray-100 py-5 px-3">
      <div className="flex items-center gap-2 mb-6 px-2">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
          <BookOpen className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-gray-900 tracking-tight">UpGrade</span>
      </div>

      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-indigo-600" : ""}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 pt-3 mt-3">
        <button
          onClick={signOut}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-50 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
