"use client";

import { useState } from "react";
import { Plus, Trash2, Target } from "lucide-react";
import {
  calculateGPA,
  optimizeGPA,
  percentToLetter,
  type Course,
} from "@/lib/gpa";

const COURSE_TYPES = ["Regular", "Honors", "AP", "IB", "DE"] as const;

let nextId = 1;
function newCourse(): Course {
  return {
    id: String(nextId++),
    name: "",
    grade: 90,
    credits: 1,
    type: "Regular",
  };
}

export default function GPAPage() {
  const [courses, setCourses] = useState<Course[]>([newCourse()]);
  const [targetGPA, setTargetGPA] = useState("3.8");
  const [weighted, setWeighted] = useState(true);
  const [showOptimizer, setShowOptimizer] = useState(false);

  const { unweighted, weighted: weightedGPA } = calculateGPA(courses);
  const suggestions = showOptimizer
    ? optimizeGPA({ courses, targetGPA: parseFloat(targetGPA), weighted })
    : [];

  function addCourse() {
    setCourses((prev) => [...prev, newCourse()]);
  }

  function removeCourse(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  function updateCourse(id: string, patch: Partial<Course>) {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  const displayGPA = weighted ? weightedGPA : unweighted;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">GPA Calculator</h1>
        <p className="text-slate-400 mt-1">
          Compute weighted & unweighted GPA, then optimize toward your target.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
          <p className="text-slate-400 text-sm mb-1">Unweighted GPA</p>
          <p className="text-4xl font-bold text-white">{unweighted.toFixed(3)}</p>
        </div>
        <div className="bg-violet-900/30 border border-violet-700/40 rounded-2xl p-6 text-center">
          <p className="text-violet-300 text-sm mb-1">Weighted GPA</p>
          <p className="text-4xl font-bold text-white">{weightedGPA.toFixed(3)}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Courses</h2>
          <button
            onClick={addCourse}
            className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300"
          >
            <Plus className="w-4 h-4" />
            Add Course
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {courses.map((course) => (
            <div key={course.id} className="flex gap-3 items-center">
              <input
                value={course.name}
                onChange={(e) => updateCourse(course.id, { name: e.target.value })}
                placeholder="Course name"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <input
                type="number"
                min={0}
                max={100}
                value={course.grade}
                onChange={(e) => updateCourse(course.id, { grade: parseInt(e.target.value) || 0 })}
                className="w-20 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <span className="text-slate-400 text-sm w-6 text-center">
                {percentToLetter(course.grade)}
              </span>
              <select
                value={course.type}
                onChange={(e) =>
                  updateCourse(course.id, { type: e.target.value as Course["type"] })
                }
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {COURSE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0.5}
                max={2}
                step={0.5}
                value={course.credits}
                onChange={(e) => updateCourse(course.id, { credits: parseFloat(e.target.value) || 1 })}
                className="w-16 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                onClick={() => removeCourse(course.id)}
                className="text-slate-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Grade (0-100) · Letter · Type · Credits
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <button
          onClick={() => setShowOptimizer(!showOptimizer)}
          className="flex items-center gap-2 text-lg font-semibold text-white w-full text-left"
        >
          <Target className="w-5 h-5 text-violet-400" />
          GPA Optimizer
        </button>

        {showOptimizer && (
          <div className="mt-4">
            <div className="flex gap-4 items-center mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Target GPA</label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.01}
                  value={targetGPA}
                  onChange={(e) => setTargetGPA(e.target.value)}
                  className="w-28 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">GPA Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWeighted(false)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      !weighted
                        ? "bg-violet-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Unweighted
                  </button>
                  <button
                    onClick={() => setWeighted(true)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      weighted
                        ? "bg-violet-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Weighted
                  </button>
                </div>
              </div>
            </div>

            {displayGPA >= parseFloat(targetGPA) ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-green-400 text-sm">
                You&apos;ve already hit your target GPA of {targetGPA}!
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-slate-400 text-sm">
                No improvements found. Try adding courses or lowering your target.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-slate-400">
                  To reach a {weighted ? "weighted" : "unweighted"} GPA of {targetGPA}, you could:
                </p>
                {suggestions.map((s) => (
                  <div
                    key={s.courseId}
                    className="bg-slate-800 rounded-xl px-4 py-3 flex items-center justify-between"
                  >
                    <span className="text-white text-sm font-medium">{s.courseName || "Unnamed Course"}</span>
                    <span className="text-violet-400 text-sm">
                      {s.currentGrade}% → {s.neededGrade}%
                      <span className="text-slate-500 ml-1">(+{s.improvement}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
