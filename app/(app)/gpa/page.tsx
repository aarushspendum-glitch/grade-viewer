"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Target, ChevronDown, ChevronUp } from "lucide-react";
import {
  GPA_CONFIGS,
  getConfig, calculateDistrictGPA, detectCourseType, shouldExclude, pctToLetter,
  type GPACourse, type CourseType,
} from "@/lib/gpa-configs";
import { optimizeGPA } from "@/lib/gpa";
import type { GradebookData } from "@/lib/studentvue/types";

const COURSE_TYPES: CourseType[] = ["Regular", "Honors", "AP", "IB", "DE"];
let nextId = 1;

const SCHOOL_YEARS = ["2024-25", "2023-24", "2022-23", "2021-22", "2020-21"];

function blank(year = "Current"): GPACourse {
  return { id: String(nextId++), name: "", grade: 90, credits: 1, type: "Regular", year };
}

export default function GPAPage() {
  const [courses, setCourses] = useState<GPACourse[]>([]);
  const [districtId, setDistrictId] = useState("fcps");
  const [targetGPA, setTargetGPA] = useState("3.8");
  const [useWeighted, setUseWeighted] = useState(true);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [addYear, setAddYear] = useState("Current");
  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set());

  const config = getConfig(districtId);
  const { unweighted, weighted, totalCredits } = calculateDistrictGPA(courses, config);

  useEffect(() => {
    const storedDistrict = sessionStorage.getItem("district");
    if (storedDistrict) setDistrictId(storedDistrict);

    const raw = sessionStorage.getItem("gradebook");
    if (raw) {
      try {
        const gb: GradebookData = JSON.parse(raw);
        const imported = gb.courses
          .filter((c) => c.grade !== null && !shouldExclude(c.name))
          .map((c) => ({
            id: String(nextId++),
            name: c.name,
            grade: c.grade!,
            credits: 1,
            type: detectCourseType(c.name),
            year: "Current",
          }));
        if (imported.length > 0) setCourses(imported);
      } catch { /* skip */ }
    }
  }, []);

  function addCourse() {
    setCourses((p) => [...p, blank(addYear)]);
  }
  function addYearBatch(year: string) {
    setCourses((p) => [...p, ...Array.from({ length: 7 }, () => blank(year))]);
    setCollapsedYears((s) => { const n = new Set(s); n.delete(year); return n; });
  }
  function remove(id: string) { setCourses((p) => p.filter((c) => c.id !== id)); }
  function update(id: string, patch: Partial<GPACourse>) {
    setCourses((p) => p.map((c) => c.id === id ? { ...c, ...patch } : c));
  }
  function toggleExclude(id: string) {
    setCourses((p) => p.map((c) => c.id === id ? { ...c, excluded: !c.excluded } : c));
  }
  function toggleYear(year: string) {
    setCollapsedYears((s) => { const n = new Set(s); n.has(year) ? n.delete(year) : n.add(year); return n; });
  }

  const allYears = [...new Set(courses.map((c) => c.year ?? ""))].filter(Boolean);
  // Sort: "Current" first, then years descending
  const years = allYears.sort((a, b) => {
    if (a === "Current") return -1;
    if (b === "Current") return 1;
    return b.localeCompare(a);
  });

  const optimizerCourses = courses
    .filter((c) => !c.excluded)
    .map((c) => ({ id: c.id, name: c.name, grade: c.grade, credits: c.credits, type: c.type }));

  const suggestions = showOptimizer
    ? optimizeGPA({ courses: optimizerCourses, targetGPA: parseFloat(targetGPA), weighted: useWeighted })
    : [];

  const displayGPA = useWeighted ? weighted : unweighted;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GPA Calculator</h1>
          <p className="text-sm text-gray-500 mt-1">
            Current semester auto-loaded. Add past years below to get your cumulative GPA.
          </p>
        </div>
        <select
          value={districtId}
          onChange={(e) => setDistrictId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {Object.entries(GPA_CONFIGS)
            .filter(([k]) => k !== "default")
            .map(([k, v]) => (
              <option key={k} value={k}>{v.name}</option>
            ))}
        </select>
      </div>

      {/* GPA cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Unweighted</p>
          <p className="text-4xl font-bold tabular-nums text-gray-900">{unweighted.toFixed(3)}</p>
          <p className="text-xs text-gray-400 mt-1">out of 4.0</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide mb-1">Weighted</p>
          <p className="text-4xl font-bold tabular-nums text-indigo-700">{weighted.toFixed(3)}</p>
          <p className="text-xs text-indigo-400 mt-1">
            {config.name} · AP +{config.weights.AP} · HN +{config.weights.Honors}
          </p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Total Credits</p>
          <p className="text-4xl font-bold tabular-nums text-gray-900">{totalCredits.toFixed(1)}</p>
          <p className="text-xs text-gray-400 mt-1">{courses.filter((c) => !c.excluded).length} courses counted</p>
        </div>
      </div>

      {/* Add past year banner */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
        <p className="text-sm text-amber-700 font-medium flex-1">
          Add your previous years' courses to calculate your real cumulative GPA.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {SCHOOL_YEARS.slice(1).map((y) => (
            <button
              key={y}
              onClick={() => addYearBatch(y)}
              disabled={courses.some((c) => c.year === y)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              + {y}
            </button>
          ))}
        </div>
      </div>

      {/* Course table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="font-semibold text-gray-900">Courses</h2>
          <div className="flex items-center gap-2">
            <select
              value={addYear}
              onChange={(e) => setAddYear(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="Current">Current</option>
              {SCHOOL_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={addCourse}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add course
            </button>
          </div>
        </div>

        {courses.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No courses yet. Sign in on the Grades page or add manually.</p>
        )}

        <div className="flex flex-col gap-4">
          {years.map((year) => {
            const yearCourses = courses.filter((c) => (c.year ?? "") === year);
            const collapsed = collapsedYears.has(year);
            const yearConfig = getConfig(districtId);
            const { unweighted: uw, weighted: w } = calculateDistrictGPA(yearCourses, yearConfig);

            return (
              <div key={year}>
                {/* Year header */}
                <button
                  onClick={() => toggleYear(year)}
                  className="w-full flex items-center justify-between mb-2 group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{year}</span>
                    <span className="text-xs text-gray-400">
                      {yearCourses.filter((c) => !c.excluded).length} courses
                    </span>
                    <span className="text-xs text-indigo-500 tabular-nums">
                      {w.toFixed(2)}W / {uw.toFixed(2)}UW
                    </span>
                  </div>
                  {collapsed
                    ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    : <ChevronUp className="w-3.5 h-3.5 text-gray-400" />}
                </button>

                {!collapsed && (
                  <>
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_60px_34px_76px_52px_44px_16px] gap-2 mb-1 px-1">
                      {["Course", "Grade %", "Ltr", "Type", "Credits", "Count", ""].map((h) => (
                        <p key={h} className="text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</p>
                      ))}
                    </div>
                    {yearCourses.map((course) => (
                      <div
                        key={course.id}
                        className={`grid grid-cols-[1fr_60px_34px_76px_52px_44px_16px] gap-2 items-center mb-1.5 ${course.excluded ? "opacity-40" : ""}`}
                      >
                        <input
                          value={course.name}
                          onChange={(e) => update(course.id, { name: e.target.value, type: detectCourseType(e.target.value) })}
                          placeholder="Course name"
                          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <input
                          type="number" min={0} max={100}
                          value={course.grade}
                          onChange={(e) => update(course.id, { grade: parseFloat(e.target.value) || 0 })}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center tabular-nums text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <p className={`text-sm font-semibold text-center ${
                          course.grade >= config.scale[0].min ? "text-emerald-600"
                          : course.grade >= config.scale[1].min ? "text-blue-600"
                          : course.grade >= config.scale[2].min ? "text-amber-600"
                          : "text-red-500"}`}>
                          {pctToLetter(course.grade, config)}
                        </p>
                        <select
                          value={course.type}
                          onChange={(e) => update(course.id, { type: e.target.value as CourseType })}
                          className="border border-gray-200 rounded-lg px-1.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                        >
                          {COURSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input
                          type="number" min={0.5} max={2} step={0.5}
                          value={course.credits}
                          onChange={(e) => update(course.id, { credits: parseFloat(e.target.value) || 1 })}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center tabular-nums text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <button
                          onClick={() => toggleExclude(course.id)}
                          title={course.excluded ? "Click to include" : "Click to exclude"}
                          className={`text-xs px-1.5 py-1 rounded font-medium transition-colors ${course.excluded ? "bg-gray-100 text-gray-400" : "bg-emerald-50 text-emerald-600 hover:bg-gray-100"}`}
                        >
                          {course.excluded ? "off" : "on"}
                        </button>
                        <button onClick={() => remove(course.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Tip: "Count" excludes a course from GPA (e.g. P/E, study hall). Credits default to 1 — change if your school uses 0.5 per semester.
        </p>
      </div>

      {/* Optimizer */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">GPA Optimizer</h2>
            <p className="text-sm text-gray-500 mt-0.5">Find the smallest grade boost to hit your target.</p>
          </div>
          <button
            onClick={() => setShowOptimizer(!showOptimizer)}
            className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${showOptimizer ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            <Target className="w-3.5 h-3.5" />
            {showOptimizer ? "Hide" : "Run optimizer"}
          </button>
        </div>

        {showOptimizer && (
          <div className="mt-5">
            <div className="flex gap-3 items-end mb-5 flex-wrap">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Target GPA</label>
                <input
                  type="number" min={0} max={5} step={0.01}
                  value={targetGPA}
                  onChange={(e) => setTargetGPA(e.target.value)}
                  className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 tabular-nums"
                />
              </div>
              <div className="flex gap-1.5">
                {(["Unweighted", "Weighted"] as const).map((label) => {
                  const isW = label === "Weighted";
                  return (
                    <button key={label} onClick={() => setUseWeighted(isW)}
                      className={`text-sm px-3 py-2 rounded-lg font-medium transition-colors ${useWeighted === isW ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {displayGPA >= parseFloat(targetGPA) ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium">
                You already hit {targetGPA}. Try a higher target.
              </div>
            ) : suggestions.length === 0 ? (
              <p className="text-sm text-gray-400">No single-class improvement can reach that target.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-gray-500 mb-1">
                  Any one of these would push your {useWeighted ? "weighted" : "unweighted"} GPA to {targetGPA}:
                </p>
                {suggestions.map((s) => (
                  <div key={s.courseId} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                    <span className="text-sm font-medium text-gray-800 truncate">{s.courseName || "Unnamed"}</span>
                    <div className="flex items-center gap-2 text-sm flex-shrink-0 ml-2">
                      <span className="text-gray-400 tabular-nums">{s.currentGrade}%</span>
                      <span className="text-gray-300">→</span>
                      <span className="text-indigo-600 font-semibold tabular-nums">{s.neededGrade}%</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full tabular-nums">+{s.improvement}%</span>
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
