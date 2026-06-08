"use client";

import { useRouter } from "next/navigation";
import type { CourseGrade } from "@/lib/studentvue/types";

function gradeColor(letter: string) {
  const l = (letter || "N")[0].toUpperCase();
  if (l === "A") return { badge: "text-emerald-700 bg-emerald-50", bar: "bg-emerald-500" };
  if (l === "B") return { badge: "text-blue-700 bg-blue-50",       bar: "bg-blue-500" };
  if (l === "C") return { badge: "text-amber-700 bg-amber-50",     bar: "bg-amber-500" };
  if (l === "D") return { badge: "text-orange-700 bg-orange-50",   bar: "bg-orange-500" };
  return           { badge: "text-red-700 bg-red-50",              bar: "bg-red-500" };
}

function pctToLetter(pct: number): string {
  if (pct >= 92.5) return "A";
  if (pct >= 89.5) return "A-";
  if (pct >= 86.5) return "B+";
  if (pct >= 82.5) return "B";
  if (pct >= 79.5) return "B-";
  if (pct >= 76.5) return "C+";
  if (pct >= 72.5) return "C";
  if (pct >= 69.5) return "C-";
  if (pct >= 59.5) return "D";
  return "F";
}

export default function GradeCard({ course }: { course: CourseGrade }) {
  const router = useRouter();
  const displayLetter = course.letter !== "N/A" && course.letter
    ? course.letter
    : (course.grade !== null ? pctToLetter(course.grade) : "N/A");
  const colors = gradeColor(displayLetter);
  const pct    = course.grade;

  return (
    <button
      onClick={() => router.push(`/grades/${encodeURIComponent(course.id)}`)}
      className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all text-left w-full"
    >
      <div className="flex items-center gap-4 px-5 py-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-base ${colors.badge}`}>
          {displayLetter}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{course.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Period {course.period}{course.teacher ? ` · ${course.teacher}` : ""}
          </p>
          {pct !== null && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <span className="text-xs text-gray-500 font-medium tabular-nums">{pct.toFixed(1)}%</span>
            </div>
          )}
        </div>

        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
