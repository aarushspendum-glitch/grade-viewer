"use client";

import { useState } from "react";
import { DISTRICTS } from "@/lib/studentvue/districts";
import type { GradebookData } from "@/lib/studentvue/types";
import GradeCard from "@/components/GradeCard";
import { Loader2, RefreshCw, ChevronDown, Lock } from "lucide-react";
import { calculateGPA } from "@/lib/gpa";

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
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Grades</h1>
        <p className="text-gray-500 text-sm mt-1">
          {gradebook
            ? `${gradebook.courses.length} classes · ${gradebook.reportingPeriod}`
            : "Connect your StudentVUE account to get started."}
        </p>
      </div>

      {!gradebook ? (
        <div className="max-w-sm">
          <form onSubmit={fetchGrades} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-5">Connect StudentVUE</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">School district</label>
                <div className="relative">
                  <select
                    value={districtId}
                    onChange={(e) => setDistrictId(e.target.value)}
                    className="w-full appearance-none border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Student ID or username"
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
                  <><Loader2 className="w-4 h-4 animate-spin" /> Loading grades…</>
                ) : "Sync grades"}
              </button>
            </div>

            <div className="flex items-center gap-1.5 mt-4">
              <Lock className="w-3 h-3 text-gray-300" />
              <p className="text-xs text-gray-400">
                Your password goes directly to your school and is never stored.
              </p>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* GPA strip */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatCard label="Unweighted GPA" value={unweighted.toFixed(2)} sub="out of 4.0" color="text-gray-900" />
            <StatCard label="Weighted GPA" value={weighted.toFixed(2)} sub="with AP/IB bonus" color="text-indigo-600" />
            <StatCard label="Courses" value={String(gradebook.courses.length)} sub={gradebook.reportingPeriod} color="text-gray-900" />
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">All classes</h2>
            <button
              onClick={() => setGradebook(null)}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {gradebook.courses.map((course) => (
              <GradeCard key={course.id} course={course} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}
