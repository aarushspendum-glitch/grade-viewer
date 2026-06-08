"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, X } from "lucide-react";
import type { CourseGrade, Assignment } from "@/lib/studentvue/types";

function gradeColor(letter: string) {
  const l = (letter || "N")[0].toUpperCase();
  if (l === "A") return { badge: "text-emerald-700 bg-emerald-50", bar: "bg-emerald-500" };
  if (l === "B") return { badge: "text-blue-700 bg-blue-50",       bar: "bg-blue-500" };
  if (l === "C") return { badge: "text-amber-700 bg-amber-50",     bar: "bg-amber-500" };
  if (l === "D") return { badge: "text-orange-700 bg-orange-50",   bar: "bg-orange-500" };
  return           { badge: "text-red-700 bg-red-50",              bar: "bg-red-500" };
}

function scoreColor(pct: number | null) {
  if (pct === null) return "text-gray-400";
  if (pct >= 90) return "text-emerald-600";
  if (pct >= 80) return "text-blue-600";
  if (pct >= 70) return "text-amber-600";
  return "text-red-500";
}

// Re-calculate a course grade from assignments + overrides
function calcProjected(
  assignments: Assignment[],
  overrides: Record<string, number>,
  categories: CourseGrade["categories"]
): number | null {
  if (categories.length === 0) {
    // No category weights — simple average
    const graded = assignments.filter((a) => !a.isDropped);
    if (graded.length === 0) return null;
    let pts = 0, max = 0;
    for (const a of graded) {
      const s = overrides[a.id] !== undefined ? overrides[a.id] : a.score;
      if (s !== null) { pts += s; max += a.maxScore; }
    }
    return max > 0 ? (pts / max) * 100 : null;
  }

  // Weighted categories
  let weightSum = 0, weightedScore = 0;
  for (const cat of categories) {
    const catAssignments = assignments.filter(
      (a) => a.category.toLowerCase() === cat.name.toLowerCase() && !a.isDropped
    );
    if (catAssignments.length === 0) continue;
    let pts = 0, max = 0;
    for (const a of catAssignments) {
      const s = overrides[a.id] !== undefined ? overrides[a.id] : a.score;
      if (s !== null) { pts += s; max += a.maxScore; }
    }
    if (max === 0) continue;
    weightedScore += (pts / max) * cat.weight;
    weightSum += cat.weight;
  }
  return weightSum > 0 ? (weightedScore / weightSum) * 100 : null;
}

function pctToLetter(pct: number): string {
  if (pct >= 97) return "A+";
  if (pct >= 93) return "A";
  if (pct >= 90) return "A-";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B-";
  if (pct >= 77) return "C+";
  if (pct >= 73) return "C";
  if (pct >= 70) return "C-";
  if (pct >= 67) return "D+";
  if (pct >= 63) return "D";
  if (pct >= 60) return "D-";
  return "F";
}

export default function GradeCard({ course }: { course: CourseGrade }) {
  const [open, setOpen] = useState(false);
  const [whatIfMode, setWhatIfMode] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const displayLetter = course.letter !== "N/A" && course.letter ? course.letter : (course.grade !== null ? pctToLetter(course.grade) : "N/A");
  const colors = gradeColor(displayLetter);
  const pct = course.grade !== null ? course.grade : null;

  const projectedPct = whatIfMode
    ? calcProjected(course.assignments, overrides, course.categories)
    : pct;
  const projectedLetter = projectedPct !== null ? pctToLetter(projectedPct) : displayLetter;
  const projectedColors = gradeColor(projectedLetter);

  const hasOverrides = Object.keys(overrides).length > 0;

  function setOverride(id: string, val: string) {
    const n = parseFloat(val);
    if (val === "" || isNaN(n)) {
      const next = { ...overrides };
      delete next[id];
      setOverrides(next);
    } else {
      setOverrides({ ...overrides, [id]: n });
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header row */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors text-left"
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-base ${whatIfMode && hasOverrides ? projectedColors.badge : colors.badge}`}>
          {whatIfMode && hasOverrides ? projectedLetter : displayLetter}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{course.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Period {course.period}{course.teacher ? ` · ${course.teacher}` : ""}
          </p>
          {(projectedPct !== null) && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${whatIfMode && hasOverrides ? projectedColors.bar : colors.bar}`}
                  style={{ width: `${Math.min(projectedPct, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 font-medium tabular-nums">
                {projectedPct.toFixed(1)}%
                {whatIfMode && hasOverrides && pct !== null && (
                  <span className={`ml-1 ${projectedPct > pct ? "text-emerald-500" : projectedPct < pct ? "text-red-400" : ""}`}>
                    ({projectedPct > pct ? "+" : ""}{(projectedPct - pct).toFixed(1)})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="text-gray-300 flex-shrink-0">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded */}
      {open && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/40">
          {/* What-if toggle */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {whatIfMode ? "What-If Mode" : "Assignments"}
            </p>
            <button
              onClick={() => { setWhatIfMode(!whatIfMode); if (whatIfMode) setOverrides({}); }}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                whatIfMode
                  ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {whatIfMode ? <><X className="w-3 h-3" /> Exit what-if</> : <><Pencil className="w-3 h-3" /> What-if</>}
            </button>
          </div>

          {/* Categories */}
          {course.categories.length > 0 && (
            <div className="mb-4 flex flex-col gap-2">
              {course.categories.map((cat) => {
                const catPct = cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 0;
                return (
                  <div key={cat.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-600">{cat.name}</span>
                      <span className="text-gray-400 tabular-nums">{cat.weight}% weight</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-300 rounded-full" style={{ width: `${Math.min(catPct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Assignment list */}
          {course.assignments.length > 0 ? (
            <div className="flex flex-col gap-1 max-h-72 overflow-y-auto -mx-1 px-1">
              {course.assignments.map((a) => {
                const override = overrides[a.id];
                const displayScore = override !== undefined ? override : a.score;
                const displayPct = displayScore !== null && displayScore !== undefined
                  ? (displayScore / a.maxScore) * 100
                  : a.percentage;

                return (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-white border border-gray-100 ${a.isDropped ? "opacity-40" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`text-gray-800 truncate text-xs font-medium ${a.isDropped ? "line-through" : ""}`}>
                        {a.name}
                      </p>
                      <p className="text-xs text-gray-400">{a.category}</p>
                    </div>

                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {whatIfMode ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={a.maxScore}
                            value={override !== undefined ? override : (a.score ?? "")}
                            onChange={(e) => setOverride(a.id, e.target.value)}
                            placeholder={a.score !== null ? String(a.score) : "—"}
                            className="w-14 text-xs border border-indigo-200 rounded px-1.5 py-1 text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-indigo-50"
                          />
                          <span className="text-xs text-gray-400">/{a.maxScore}</span>
                        </div>
                      ) : (
                        <span className={`font-medium tabular-nums text-xs ${scoreColor(displayPct)}`}>
                          {a.score !== null ? `${a.score}/${a.maxScore}` : "—"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No assignments yet.</p>
          )}

          {whatIfMode && hasOverrides && (
            <button
              onClick={() => setOverrides({})}
              className="mt-3 text-xs text-gray-400 hover:text-gray-600"
            >
              Reset all overrides
            </button>
          )}
        </div>
      )}
    </div>
  );
}
