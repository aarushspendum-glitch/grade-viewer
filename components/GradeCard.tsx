"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import type { CourseGrade } from "@/lib/studentvue/types";

function gradeColor(letter: string): string {
  const l = letter[0];
  if (l === "A") return "text-emerald-600 bg-emerald-50";
  if (l === "B") return "text-blue-600 bg-blue-50";
  if (l === "C") return "text-amber-600 bg-amber-50";
  if (l === "D") return "text-orange-600 bg-orange-50";
  return "text-red-600 bg-red-50";
}

function gradeBarColor(letter: string): string {
  const l = letter[0];
  if (l === "A") return "bg-emerald-500";
  if (l === "B") return "bg-blue-500";
  if (l === "C") return "bg-amber-500";
  if (l === "D") return "bg-orange-500";
  return "bg-red-500";
}

function assignmentScoreColor(pct: number | null): string {
  if (pct === null) return "text-gray-400";
  if (pct >= 90) return "text-emerald-600";
  if (pct >= 80) return "text-blue-600";
  if (pct >= 70) return "text-amber-600";
  return "text-red-500";
}

export default function GradeCard({ course }: { course: CourseGrade }) {
  const [open, setOpen] = useState(false);
  const pct = course.grade !== null ? course.grade : null;
  const colorClass = gradeColor(course.letter);
  const barColor = gradeBarColor(course.letter);

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors text-left"
      >
        {/* Grade badge */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg ${colorClass}`}>
          {course.letter}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{course.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Period {course.period}{course.teacher ? ` · ${course.teacher}` : ""}
          </p>
          {pct !== null && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 font-medium tabular-nums">{pct.toFixed(1)}%</span>
            </div>
          )}
        </div>

        <div className="text-gray-300 flex-shrink-0">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/40">
          {course.categories.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Categories
              </p>
              <div className="flex flex-col gap-3">
                {course.categories.map((cat) => {
                  const catPct = cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 0;
                  return (
                    <div key={cat.name}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-gray-700">{cat.name}</span>
                        <span className="text-gray-400 tabular-nums">
                          {cat.score.toFixed(0)}/{cat.maxScore.toFixed(0)}
                          <span className="ml-1.5 text-gray-300">({cat.weight}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-400 rounded-full transition-all"
                          style={{ width: `${Math.min(catPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {course.assignments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Assignments
              </p>
              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto -mx-1 px-1">
                {course.assignments.map((a) => (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between text-sm px-3 py-2.5 rounded-lg bg-white border border-gray-100 ${
                      a.isDropped ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {a.score !== null && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className={`text-gray-800 truncate block ${a.isDropped ? "line-through" : ""}`}>
                          {a.name}
                        </span>
                        <span className="text-xs text-gray-400">{a.category}</span>
                      </div>
                    </div>
                    <span className={`font-medium tabular-nums flex-shrink-0 ml-2 ${assignmentScoreColor(a.percentage)}`}>
                      {a.score !== null ? `${a.score}/${a.maxScore}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
