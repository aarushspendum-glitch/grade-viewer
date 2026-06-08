"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { CourseGrade } from "@/lib/studentvue/types";

const LETTER_COLOR: Record<string, string> = {
  A: "text-green-400",
  B: "text-blue-400",
  C: "text-yellow-400",
  D: "text-orange-400",
  F: "text-red-400",
};

function letterColor(letter: string) {
  return LETTER_COLOR[letter[0]] ?? "text-slate-400";
}

export default function GradeCard({ course }: { course: CourseGrade }) {
  const [open, setOpen] = useState(false);

  const pct = course.grade !== null ? course.grade.toFixed(1) + "%" : "N/A";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/50 transition-colors"
      >
        <div className="text-left">
          <p className="font-semibold text-white">{course.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Period {course.period} · {course.teacher}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={`text-xl font-bold ${letterColor(course.letter)}`}>{course.letter}</p>
            <p className="text-xs text-slate-400">{pct}</p>
          </div>
          {open ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-800 px-5 py-4">
          {course.categories.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Categories
              </p>
              <div className="flex flex-col gap-2">
                {course.categories.map((cat) => {
                  const pct = cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 0;
                  return (
                    <div key={cat.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">{cat.name}</span>
                        <span className="text-slate-400">
                          {cat.score}/{cat.maxScore} ({cat.weight}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full"
                          style={{ width: `${Math.min(pct, 100)}%` }}
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
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Assignments ({course.assignments.length})
              </p>
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                {course.assignments.map((a) => (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${
                      a.isDropped ? "opacity-40 line-through" : ""
                    } bg-slate-800/60`}
                  >
                    <div>
                      <span className="text-white">{a.name}</span>
                      <span className="text-slate-500 text-xs ml-2">{a.category}</span>
                    </div>
                    <span className={a.score !== null ? letterColor(a.percentage !== null && a.percentage >= 90 ? "A" : a.percentage !== null && a.percentage >= 80 ? "B" : a.percentage !== null && a.percentage >= 70 ? "C" : "D") : "text-slate-500"}>
                      {a.score !== null ? `${a.score}/${a.maxScore}` : "Not graded"}
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
