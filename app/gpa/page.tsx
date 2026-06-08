"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { calculateGPA, optimizeGPA, percentToLetter, type Course } from "@/lib/gpa";

const COURSE_TYPES = ["Regular", "Honors", "AP", "IB", "DE"] as const;

let nextId = 1;
function newCourse(): Course {
  return { id: String(nextId++), name: "", grade: 90, credits: 1, type: "Regular" };
}

export default function GPAPage() {
  const [courses, setCourses] = useState<Course[]>([newCourse()]);
  const [targetGPA, setTargetGPA] = useState("3.8");
  const [useWeighted, setUseWeighted] = useState(true);
  const [showOptimizer, setShowOptimizer] = useState(false);

  const { unweighted, weighted } = calculateGPA(courses);
  const suggestions = showOptimizer
    ? optimizeGPA({ courses, targetGPA: parseFloat(targetGPA), weighted: useWeighted })
    : [];

  const displayGPA = useWeighted ? weighted : unweighted;

  function addCourse() { setCourses((p) => [...p, newCourse()]); }
  function removeCourse(id: string) { setCourses((p) => p.filter((c) => c.id !== id)); }
  function update(id: string, patch: Partial<Course>) {
    setCourses((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">GPA Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">Add your classes, then run the optimizer to hit your target.</p>
      </div>

      {/* GPA display */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-6 py-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Unweighted</p>
          <p className="text-4xl font-bold tabular-nums text-gray-900">{unweighted.toFixed(3)}</p>
          <p className="text-xs text-gray-400 mt-1">out of 4.0</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm px-6 py-5">
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide mb-1">Weighted</p>
          <p className="text-4xl font-bold tabular-nums text-indigo-700">{weighted.toFixed(3)}</p>
          <p className="text-xs text-indigo-400 mt-1">with AP/Honors bonus</p>
        </div>
      </div>

      {/* Courses */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Courses</h2>
          <button
            onClick={addCourse}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add class
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_72px_56px_96px_80px_24px] gap-2 mb-2 px-1">
          {["Class name", "Grade", "Letter", "Type", "Credits", ""].map((h) => (
            <p key={h} className="text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</p>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {courses.map((course) => (
            <div key={course.id} className="grid grid-cols-[1fr_72px_56px_96px_80px_24px] gap-2 items-center">
              <input
                value={course.name}
                onChange={(e) => update(course.id, { name: e.target.value })}
                placeholder="e.g. AP Calculus BC"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
              />
              <input
                type="number"
                min={0}
                max={100}
                value={course.grade}
                onChange={(e) => update(course.id, { grade: parseInt(e.target.value) || 0 })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-center tabular-nums text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
              />
              <div className="text-center">
                <span className={`text-sm font-semibold ${
                  course.grade >= 90 ? "text-emerald-600" :
                  course.grade >= 80 ? "text-blue-600" :
                  course.grade >= 70 ? "text-amber-600" : "text-red-500"
                }`}>
                  {percentToLetter(course.grade)}
                </span>
              </div>
              <select
                value={course.type}
                onChange={(e) => update(course.id, { type: e.target.value as Course["type"] })}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white transition-all"
              >
                {COURSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                type="number"
                min={0.5}
                max={2}
                step={0.5}
                value={course.credits}
                onChange={(e) => update(course.id, { credits: parseFloat(e.target.value) || 1 })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-center tabular-nums text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
              />
              <button
                onClick={() => removeCourse(course.id)}
                className="text-gray-300 hover:text-red-400 transition-colors flex justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Optimizer */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">GPA Optimizer</h2>
            <p className="text-sm text-gray-500 mt-0.5">Find the minimum boost needed to reach a target GPA.</p>
          </div>
          <button
            onClick={() => setShowOptimizer(!showOptimizer)}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              showOptimizer
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {showOptimizer ? "Hide" : "Run optimizer"}
          </button>
        </div>

        {showOptimizer && (
          <div className="mt-5">
            <div className="flex gap-3 items-end mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Target GPA</label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.01}
                  value={targetGPA}
                  onChange={(e) => setTargetGPA(e.target.value)}
                  className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 tabular-nums"
                />
              </div>
              <div className="flex gap-1.5 mb-0">
                <button
                  onClick={() => setUseWeighted(false)}
                  className={`text-sm px-3 py-2 rounded-lg font-medium transition-colors ${
                    !useWeighted ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  Unweighted
                </button>
                <button
                  onClick={() => setUseWeighted(true)}
                  className={`text-sm px-3 py-2 rounded-lg font-medium transition-colors ${
                    useWeighted ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  Weighted
                </button>
              </div>
            </div>

            {displayGPA >= parseFloat(targetGPA) ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium">
                You already hit {targetGPA}. Nice work — try setting a higher target.
              </div>
            ) : suggestions.length === 0 ? (
              <p className="text-sm text-gray-400">No single-class improvement can reach that target. Try a lower goal.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-gray-500 mb-1">
                  Any of these single improvements would push your {useWeighted ? "weighted" : "unweighted"} GPA to {targetGPA}:
                </p>
                {suggestions.map((s) => (
                  <div
                    key={s.courseId}
                    className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3"
                  >
                    <span className="text-sm font-medium text-gray-800">
                      {s.courseName || "Unnamed class"}
                    </span>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400 tabular-nums">{s.currentGrade}%</span>
                      <span className="text-gray-300">→</span>
                      <span className="text-indigo-600 font-semibold tabular-nums">{s.neededGrade}%</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full tabular-nums">
                        +{s.improvement}%
                      </span>
                    </div>
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
