"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DISTRICTS } from "@/lib/studentvue/districts";
import { BookOpen, Loader2, ChevronDown, Lock, BarChart3, Edit3, Target } from "lucide-react";

// Group districts by state for the dropdown
const BY_STATE = DISTRICTS.reduce<Record<string, typeof DISTRICTS>>((acc, d) => {
  if (!acc[d.state]) acc[d.state] = [];
  acc[d.state].push(d);
  return acc;
}, {});

export default function HomePage() {
  const router = useRouter();
  const [districtId, setDistrictId] = useState("fcps");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const district = DISTRICTS.find((d) => d.id === districtId)!;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, districtUrl: district.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not connect to your school's system.");
      // Store grades in sessionStorage so other pages can read them
      sessionStorage.setItem("gradebook", JSON.stringify(data));
      sessionStorage.setItem("district", districtId);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg tracking-tight">UpGrade</span>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Hero text */}
        <div className="text-center mb-10 max-w-lg">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-3">
            Your grades, finally clear.
          </h1>
          <p className="text-gray-500 text-lg">
            Connect your school account and get a clean view of every class, assignment, and what your GPA could be.
          </p>
        </div>

        {/* Login card */}
        <div className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">School district</label>
              <div className="relative">
                <select
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  className="w-full appearance-none border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.entries(BY_STATE).sort().map(([state, districts]) => (
                    <optgroup key={state} label={state}>
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Student ID</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Your StudentVUE username"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Loading your grades…</>
              ) : "View my grades"}
            </button>

            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-gray-300 flex-shrink-0" />
              <p className="text-xs text-gray-400">
                Your password is sent directly to your school and never stored.
              </p>
            </div>
          </form>
        </div>

        {/* Feature strip */}
        <div className="flex gap-6 mt-12 text-center flex-wrap justify-center">
          {[
            { icon: BarChart3, label: "Live grades" },
            { icon: Edit3,     label: "What-if editor" },
            { icon: Target,    label: "GPA optimizer" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-gray-400">
              <Icon className="w-4 h-4 text-indigo-400" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
