"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GradebookData } from "@/lib/studentvue/types";
import GradeCard from "@/components/GradeCard";
import { getConfig, calculateDistrictGPA, detectCourseType, shouldExclude } from "@/lib/gpa-configs";
import { RefreshCw } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [gradebook, setGradebook] = useState<GradebookData | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("gradebook");
    if (!raw) {
      router.push("/");
      return;
    }
    setGradebook(JSON.parse(raw));
  }, [router]);

  if (!gradebook) return null;

  const districtId = typeof window !== "undefined" ? (sessionStorage.getItem("district") ?? "fcps") : "fcps";
  const config = getConfig(districtId);
  const gpaInput = gradebook.courses
    .filter((c) => c.grade !== null && !shouldExclude(c.name))
    .map((c) => ({ id: c.id, name: c.name, grade: c.grade!, credits: 1, type: detectCourseType(c.name) }));

  const { unweighted, weighted } = calculateDistrictGPA(gpaInput, config);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Grades</h1>
          <p className="text-gray-500 text-sm mt-1">
            {gradebook.courses.length} classes · {gradebook.reportingPeriod}
          </p>
        </div>
        <button
          onClick={() => { sessionStorage.clear(); router.push("/"); }}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* GPA strip */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Unweighted GPA" value={unweighted.toFixed(2)} sub="out of 4.0" highlight={false} />
        <StatCard label="Weighted GPA"   value={weighted.toFixed(2)}   sub="with AP / Honors / DE" highlight={true} />
        <StatCard label="Classes"        value={String(gradebook.courses.length)} sub={gradebook.reportingPeriod} highlight={false} />
      </div>

      <h2 className="font-semibold text-gray-900 mb-4">All classes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {gradebook.courses.map((course) => (
          <GradeCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight: boolean }) {
  return (
    <div className={`border rounded-xl shadow-sm px-5 py-4 ${highlight ? "bg-indigo-50 border-indigo-100" : "bg-white border-gray-100"}`}>
      <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${highlight ? "text-indigo-400" : "text-gray-400"}`}>{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${highlight ? "text-indigo-700" : "text-gray-900"}`}>{value}</p>
      <p className={`text-xs mt-1 ${highlight ? "text-indigo-400" : "text-gray-400"}`}>{sub}</p>
    </div>
  );
}
