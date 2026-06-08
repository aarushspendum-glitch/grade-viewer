"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GradebookData } from "@/lib/studentvue/types";
import GradeCard from "@/components/GradeCard";
import { shouldExclude } from "@/lib/gpa-configs";
import { RefreshCw, Calendar, ArrowRight } from "lucide-react";
import { useUser, AvatarDisplay } from "@/contexts/UserContext";
import Link from "next/link";
import type { CalEvent } from "@/app/api/schoology-ical/route";

const ICAL_KEY = "upgrade_schoology_ical_url";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const router = useRouter();
  const { name, avatarId } = useUser();
  const [gradebook, setGradebook] = useState<GradebookData | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<CalEvent[]>([]);

  const displayName = name; // only use the name the user set in Settings, never the login ID

  useEffect(() => {
    const raw = sessionStorage.getItem("gradebook");
    if (!raw) { router.push("/"); return; }
    setGradebook(JSON.parse(raw));

    // Load calendar events if connected
    const icalUrl = localStorage.getItem(ICAL_KEY);
    if (icalUrl) {
      fetch("/api/schoology-ical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icalUrl }),
      })
        .then(r => r.json())
        .then(d => {
          const today = new Date().toISOString().slice(0, 10);
          const upcoming = (d.events as CalEvent[])
            .filter(e => e.start.slice(0, 10) >= today)
            .slice(0, 3);
          setUpcomingEvents(upcoming);
        })
        .catch(() => {});
    }
  }, [router]);

  if (!gradebook) return null;

  const visibleCourses = gradebook.courses.filter(c => !shouldExclude(c.name));

  const typeColors: Record<CalEvent["type"], string> = {
    test:       "bg-red-100 text-red-700",
    assignment: "bg-indigo-100 text-indigo-700",
    event:      "bg-amber-100 text-amber-700",
    other:      "bg-gray-100 text-gray-600",
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* ── Greeting header ── */}
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-4">
          <AvatarDisplay id={avatarId} size={48} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getGreeting()}{displayName ? `, ${displayName.split(" ")[0]}` : ""}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {gradebook.reportingPeriod} · {visibleCourses.length} classes
            </p>
          </div>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem("gradebook"); router.push("/"); }}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* ── Upcoming events widget ── */}
      {upcomingEvents.length > 0 ? (
        <Link href="/calendar" className="bg-white border border-gray-100 rounded-xl px-5 py-4 hover:shadow-md transition-shadow block mb-7">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Coming up</p>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="flex flex-col gap-2">
            {upcomingEvents.map(ev => (
              <div key={ev.uid} className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${typeColors[ev.type]}`}>
                  {ev.type === "test" ? "TEST" : ev.type === "assignment" ? "HW" : "EVENT"}
                </span>
                <span className="text-xs text-gray-700 truncate">{ev.title}</span>
                <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">
                  {new Date(ev.start.slice(0,10) + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </Link>
      ) : (
        <Link href="/calendar" className="bg-white border border-dashed border-gray-200 rounded-xl px-5 py-4 hover:bg-gray-50 transition-colors flex items-center gap-3 mb-7">
          <Calendar className="w-5 h-5 text-gray-300 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-500">Connect Schoology calendar</p>
            <p className="text-xs text-gray-400 mt-0.5">See upcoming assignments &amp; tests here</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 ml-auto flex-shrink-0" />
        </Link>
      )}

      {/* ── Course grid ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">All classes</h2>
        <Link href="/gpa" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
          View GPA calculator <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {gradebook.courses.map(course => (
          <GradeCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}
