"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Target, ChevronDown, ChevronUp, Loader2, Save, Lock, Unlock } from "lucide-react";
import {
  getConfig, calculateDistrictGPA, detectCourseType, shouldExclude,
  letterToMidPct, type GPACourse, type CourseType,
} from "@/lib/gpa-configs";
import { optimizeGPA } from "@/lib/gpa";
import type { GradebookData } from "@/lib/studentvue/types";

const COURSE_TYPES: CourseType[] = ["Regular", "Honors", "AP", "IB", "DE"];
const PAST_YEARS = ["2024-25", "2023-24", "2022-23", "2021-22", "2020-21"];
const STORAGE_KEY = "upgrade_past_courses";
const LOCK_KEY = "upgrade_locked_years";

let _id = 1;
function uid() { return String(_id++); }
function blank(year: string): GPACourse {
  return { id: uid(), name: "", grade: 95, credits: 1, type: "Regular", year };
}

function loadLockedYears(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LOCK_KEY) ?? "[]")); } catch { return new Set(); }
}
function saveLockedYears(s: Set<string>) {
  localStorage.setItem(LOCK_KEY, JSON.stringify([...s]));
}

function loadPastFromStorage(): GPACourse[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as GPACourse[]).map(c => ({ ...c, id: uid() }));
  } catch { return []; }
}
function savePastToStorage(courses: GPACourse[], lockedYears?: Set<string>) {
  // Always save non-current courses; also save current-year courses if that year is locked
  const toSave = courses.filter(c => c.year !== "Current" || lockedYears?.has("Current"));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}
function currentFromGradebook(): GPACourse[] {
  try {
    const raw = sessionStorage.getItem("gradebook");
    if (!raw) return [];
    const gb: GradebookData = JSON.parse(raw);
    return gb.courses
      .filter(c => c.grade !== null && !shouldExclude(c.name))
      .map(c => ({ id: uid(), name: c.name, grade: c.grade!, credits: 1, type: detectCourseType(c.name), year: "Current" }));
  } catch { return []; }
}

export default function GPAPage() {
  const [courses, setCourses] = useState<GPACourse[]>([]);
  const districtId = "fcps";
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [targetGPA, setTargetGPA] = useState("3.8");
  const [useWeighted, setUseWeighted] = useState(true);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set());
  const [lockedYears, setLockedYears] = useState<Set<string>>(new Set());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const config = getConfig(districtId);
  const { unweighted, weighted, totalCredits } = calculateDistrictGPA(courses, config);

  useEffect(() => {
    // FCPS-only — district is always fcps
    const locked = loadLockedYears();
    setLockedYears(locked);
    const past = loadPastFromStorage();
    // Only load live current-year courses if "Current" is not locked
    const current = locked.has("Current") ? [] : currentFromGradebook();
    // For locked past years, keep saved versions; for unlocked ones, saved version is already source of truth
    setCourses([...current, ...past]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      savePastToStorage(courses, lockedYears);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 800);
  }, [courses, lockedYears, loading]);

  function addCourse(year: string) {
    setCourses(p => [...p, blank(year)]);
    setCollapsedYears(s => { const n = new Set(s); n.delete(year); return n; });
  }
  function addYearBatch(year: string) {
    if (courses.some(c => c.year === year)) {
      setCollapsedYears(s => { const n = new Set(s); n.delete(year); return n; });
      return;
    }
    setCourses(p => [...p, ...Array.from({ length: 6 }, () => blank(year))]);
    setCollapsedYears(s => { const n = new Set(s); n.delete(year); return n; });
  }
  function remove(id: string) { setCourses(p => p.filter(c => c.id !== id)); }
  function update(id: string, patch: Partial<GPACourse>) {
    setCourses(p => p.map(c => c.id === id ? { ...c, ...patch } : c));
  }
  function setLetter(id: string, letter: string) {
    update(id, { grade: letterToMidPct(letter, config) });
  }
  function toggleExclude(id: string) {
    setCourses(p => p.map(c => c.id === id ? { ...c, excluded: !c.excluded } : c));
  }
  function toggleYear(year: string) {
    setCollapsedYears(s => { const n = new Set(s); n.has(year) ? n.delete(year) : n.add(year); return n; });
  }
  function toggleLock(year: string) {
    setLockedYears(s => {
      const n = new Set(s);
      n.has(year) ? n.delete(year) : n.add(year);
      saveLockedYears(n);
      return n;
    });
  }

  const years = [...new Set(courses.map(c => c.year ?? ""))].filter(Boolean).sort((a, b) => {
    if (a === "Current") return -1;
    if (b === "Current") return 1;
    return b.localeCompare(a);
  });
  const missingPastYears = PAST_YEARS.filter(y => !years.includes(y));

  const optimizerCourses = courses.filter(c => !c.excluded)
    .map(c => ({ id: c.id, name: c.name, grade: c.grade, credits: c.credits, type: c.type }));
  const suggestions = showOptimizer
    ? optimizeGPA({ courses: optimizerCourses, targetGPA: parseFloat(targetGPA), weighted: useWeighted })
    : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        <p className="text-sm">Loading grades…</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GPA Calculator</h1>
          <p className="text-sm text-gray-400 mt-1">
            Current year loaded live · past years saved to this browser
            {saved && <span className="ml-2 text-emerald-500 inline-flex items-center gap-1"><Save className="w-3 h-3" />Saved</span>}
          </p>
        </div>
        <span className="text-xs font-medium bg-indigo-100 text-indigo-600 px-2.5 py-1 rounded-full">
          Fairfax County Public Schools
        </span>
      </div>

      {/* GPA cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Unweighted</p>
          <p className="text-4xl font-bold tabular-nums text-gray-900">{unweighted.toFixed(3)}</p>
          <p className="text-xs text-gray-400 mt-1">out of 4.0</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide mb-1">Weighted</p>
          <p className="text-4xl font-bold tabular-nums text-indigo-700">{weighted.toFixed(3)}</p>
          <p className="text-xs text-indigo-400 mt-1">{config.name} · AP +{config.weights.AP} · HN +{config.weights.Honors}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Credits</p>
          <p className="text-4xl font-bold tabular-nums text-gray-900">{totalCredits.toFixed(1)}</p>
          <p className="text-xs text-gray-400 mt-1">{courses.filter(c => !c.excluded).length} courses counted</p>
        </div>
      </div>

      {/* Add past year prompt */}
      {missingPastYears.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-amber-700 font-medium flex-1 min-w-0">
            Add previous years for your cumulative GPA — saved automatically.
          </p>
          <div className="flex gap-2 flex-wrap">
            {missingPastYears.map(y => (
              <button key={y} onClick={() => addYearBatch(y)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors">
                + {y}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Courses */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">All Courses</h2>
          <button onClick={() => addCourse("Current")}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add course
          </button>
        </div>

        {courses.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            No courses. <a href="/" className="text-indigo-500 underline">Sign in</a> first.
          </p>
        )}

        <div className="flex flex-col gap-5">
          {years.map(year => {
            const yc = courses.filter(c => (c.year ?? "") === year);
            const collapsed = collapsedYears.has(year);
            const { unweighted: uw, weighted: w } = calculateDistrictGPA(yc, config);
            return (
              <div key={year}>
                <div className="flex items-center mb-2">
                  <button onClick={() => toggleYear(year)} className="flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700">
                        {year === "Current" ? `Current (${new Date().getFullYear()}-${String(new Date().getFullYear()+1).slice(2)})` : year}
                      </span>
                      <span className="text-xs text-gray-400">{yc.filter(c => !c.excluded).length} courses</span>
                      <span className="text-xs font-medium text-indigo-500 tabular-nums">{w.toFixed(2)}W · {uw.toFixed(2)}UW</span>
                    </div>
                    {collapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLock(year); }}
                    title={lockedYears.has(year) ? "Locked — manual edits preserved on refresh. Click to unlock." : "Unlocked — refreshing will reload from StudentVUE. Click to lock."}
                    className={`ml-2 p-1.5 rounded-lg transition-colors flex-shrink-0 ${lockedYears.has(year) ? "text-amber-500 hover:text-amber-600 bg-amber-50 border border-amber-200" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 border border-gray-200"}`}>
                    {lockedYears.has(year) ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {!collapsed && (
                  <div>
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_90px_80px_50px_42px_16px] gap-2 mb-1.5 px-1">
                      {["Course", "Grade", "Type", "Credits", "Count", ""].map(h => (
                        <p key={h} className="text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</p>
                      ))}
                    </div>

                    {yc.map(course => {
                      const currentLetter = config.scale.find(r => course.grade >= r.min)?.letter ?? "A";
                      return (
                        <div key={course.id}
                          className={`grid grid-cols-[1fr_90px_80px_50px_42px_16px] gap-2 items-center mb-1.5 ${course.excluded ? "opacity-40" : ""}`}>
                          <input value={course.name}
                            onChange={e => update(course.id, { name: e.target.value, type: detectCourseType(e.target.value) })}
                            placeholder="Course name"
                            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400" />

                          {/* Letter grade dropdown — shows all grades in this district's scale */}
                          <select value={currentLetter} onChange={e => setLetter(course.id, e.target.value)}
                            className={`border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white ${
                              currentLetter.startsWith("A") ? "text-emerald-600" :
                              currentLetter.startsWith("B") ? "text-blue-600" :
                              currentLetter.startsWith("C") ? "text-amber-600" : "text-red-500"}`}>
                            {config.scale.map(r => (
                              <option key={r.letter} value={r.letter}>{r.letter}</option>
                            ))}
                          </select>

                          <select value={course.type} onChange={e => update(course.id, { type: e.target.value as CourseType })}
                            className="border border-gray-200 rounded-lg px-1.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                            {COURSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>

                          <input type="number" min={0.5} max={2} step={0.5} value={course.credits}
                            onChange={e => update(course.id, { credits: parseFloat(e.target.value) || 1 })}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center tabular-nums text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400" />

                          <button onClick={() => toggleExclude(course.id)}
                            className={`text-xs px-1.5 py-1 rounded font-medium transition-colors ${course.excluded ? "bg-gray-100 text-gray-400" : "bg-emerald-50 text-emerald-600 hover:bg-gray-100"}`}>
                            {course.excluded ? "off" : "on"}
                          </button>
                          <button onClick={() => remove(course.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    <button onClick={() => addCourse(year)}
                      className="mt-1 text-xs text-indigo-400 hover:text-indigo-600 flex items-center gap-1 transition-colors">
                      <Plus className="w-3 h-3" /> Add course to {year}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100">
          Past courses save automatically. "Count" = included in GPA — turn off for P/E, study hall, etc.
        </p>
      </div>

      {/* Optimizer */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">GPA Optimizer</h2>
            <p className="text-sm text-gray-500 mt-0.5">Find the smallest grade boost to hit your target.</p>
          </div>
          <button onClick={() => setShowOptimizer(!showOptimizer)}
            className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${showOptimizer ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            <Target className="w-3.5 h-3.5" />
            {showOptimizer ? "Hide" : "Run optimizer"}
          </button>
        </div>

        {showOptimizer && (
          <div className="mt-5">
            <div className="flex gap-3 items-end mb-5 flex-wrap">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Target GPA</label>
                <input type="number" min={0} max={5} step={0.01} value={targetGPA}
                  onChange={e => setTargetGPA(e.target.value)}
                  className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 tabular-nums" />
              </div>
              <div className="flex gap-1.5">
                {(["Unweighted", "Weighted"] as const).map(label => {
                  const isW = label === "Weighted";
                  return (
                    <button key={label} onClick={() => setUseWeighted(isW)}
                      className={`text-sm px-3 py-2 rounded-lg font-medium transition-colors ${useWeighted === isW ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {(useWeighted ? weighted : unweighted) >= parseFloat(targetGPA) ? (
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
                {suggestions.map(s => (
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
