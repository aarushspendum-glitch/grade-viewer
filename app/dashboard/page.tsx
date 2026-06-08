"use client";

import { useState } from "react";
import { DISTRICTS } from "@/lib/studentvue/districts";
import type { GradebookData } from "@/lib/studentvue/types";
import GradeCard from "@/components/GradeCard";
import { Loader2, RefreshCw, ChevronDown } from "lucide-react";
import { calculateGPA, percentToLetter } from "@/lib/gpa";

export default function DashboardPage() {
  const [districtId, setDistrictId] = useState("fcps");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [gradebook, setGradebook] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const district = DISTRICTS.find((d) => d.id === districtId)!;

  async function fetchGrades(e: React.FormEvent) {
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
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch");
      setGradebook(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const gpaInput = gradebook?.courses
    .filter((c) => c.grade !== null)
    .map((c) => ({
      id: c.id,
      name: c.name,
      grade: c.grade!,
      credits: 1,
      type: "Regular" as const,
    })) ?? [];

  const { unweighted, weighted } = calculateGPA(gpaInput);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Connect your StudentVUE account to view your grades.</p>
      </div>

      {!gradebook && (
        <form onSubmit={fetchGrades} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Connect StudentVUE</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">School District</label>
              <div className="relative">
                <select
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.state})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">StudentVUE Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="student ID or username"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">StudentVUE Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {loading ? "Fetching grades…" : "Fetch Grades"}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Your password is sent directly to your school&apos;s StudentVUE server and is never stored.
          </p>
        </form>
      )}

      {gradebook && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatCard label="Reporting Period" value={gradebook.reportingPeriod} />
            <StatCard label="Unweighted GPA" value={unweighted.toFixed(2)} />
            <StatCard label="Weighted GPA" value={weighted.toFixed(2)} />
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              {gradebook.courses.length} Courses
            </h2>
            <button
              onClick={() => setGradebook(null)}
              className="text-sm text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gradebook.courses.map((course) => (
              <GradeCard key={course.id} course={course} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <p className="text-sm text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
