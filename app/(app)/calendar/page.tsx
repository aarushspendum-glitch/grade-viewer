"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, ExternalLink, Loader2, RefreshCw, AlertCircle, BookOpen, FlaskConical, ClipboardList, Star } from "lucide-react";
import type { CalEvent } from "@/app/api/schoology-ical/route";

const ICAL_KEY = "upgrade_schoology_ical_url";

function groupByDay(events: CalEvent[]): Map<string, CalEvent[]> {
  const map = new Map<string, CalEvent[]>();
  for (const ev of events) {
    const day = ev.start.slice(0, 10); // YYYY-MM-DD
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(ev);
  }
  return new Map([...map.entries()].sort());
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diff === 0) return `Today — ${dateLabel}`;
  if (diff === 1) return `Tomorrow — ${dateLabel}`;
  if (diff === -1) return `Yesterday — ${dateLabel}`;
  return `${weekday} — ${dateLabel}`;
}

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr === today;
}

function isPast(dateStr: string): boolean {
  return dateStr < new Date().toISOString().slice(0, 10);
}

function formatTime(isoStr: string, allDay: boolean): string {
  if (allDay) return "All day";
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const TYPE_CONFIG: Record<CalEvent["type"], { label: string; icon: React.ElementType; color: string; bg: string; dot: string }> = {
  test:       { label: "Test / Quiz", icon: FlaskConical,  color: "text-red-600",    bg: "bg-red-50 border-red-100",    dot: "bg-red-500" },
  assignment: { label: "Assignment",  icon: ClipboardList, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100", dot: "bg-indigo-500" },
  event:      { label: "Event",       icon: Star,          color: "text-amber-600",  bg: "bg-amber-50 border-amber-100",  dot: "bg-amber-500" },
  other:      { label: "Other",       icon: BookOpen,      color: "text-gray-600",   bg: "bg-gray-50 border-gray-100",    dot: "bg-gray-400" },
};

export default function CalendarPage() {
  const [icalUrl, setIcalUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPast, setShowPast] = useState(false);
  const [filterType, setFilterType] = useState<CalEvent["type"] | "all">("all");

  useEffect(() => {
    const saved = localStorage.getItem(ICAL_KEY);
    if (saved) {
      setIcalUrl(saved);
      setInputUrl(saved);
    }
  }, []);

  const fetchCalendar = useCallback(async (url: string) => {
    if (!url) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/schoology-ical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icalUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load calendar.");
      setEvents(data.events as CalEvent[]);
      localStorage.setItem(ICAL_KEY, url);
      setIcalUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (icalUrl) fetchCalendar(icalUrl);
  }, [icalUrl, fetchCalendar]);

  function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    fetchCalendar(inputUrl.trim());
  }

  const today = new Date().toISOString().slice(0, 10);
  const filtered = events
    .filter(ev => filterType === "all" || ev.type === filterType)
    .filter(ev => showPast || ev.start.slice(0, 10) >= today);
  const grouped = groupByDay(filtered);

  // Stats
  const upcoming = events.filter(ev => ev.start.slice(0, 10) >= today);
  const testCount = upcoming.filter(e => e.type === "test").length;
  const assignCount = upcoming.filter(e => e.type === "assignment").length;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-400 mt-1">Synced from your Schoology iCal feed</p>
        </div>
        {icalUrl && (
          <button onClick={() => fetchCalendar(icalUrl)} disabled={loading}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Connect card — shown if no URL saved yet */}
      {!icalUrl && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Connect Schoology Calendar</h2>
              <p className="text-sm text-gray-500">Paste your personal iCal URL to see assignments and tests.</p>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-4 text-sm text-indigo-800">
            <p className="font-medium mb-1">How to find your iCal URL:</p>
            <ol className="list-decimal list-inside space-y-1 text-indigo-700">
              <li>Go to <a href="https://fcps.schoology.com" target="_blank" rel="noreferrer" className="underline font-medium">fcps.schoology.com</a></li>
              <li>Click your profile photo → <strong>Settings</strong></li>
              <li>Scroll to <strong>Notifications</strong> → <strong>Calendar</strong></li>
              <li>Copy the iCal URL (looks like <code className="bg-indigo-100 px-1 rounded text-xs">…/ical/user/…/index.ics</code>)</li>
            </ol>
          </div>

          <form onSubmit={handleConnect} className="flex gap-2">
            <input value={inputUrl} onChange={e => setInputUrl(e.target.value)}
              placeholder="https://app.schoology.com/ical/user/…/index.ics"
              className="flex-1 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button type="submit" disabled={loading || !inputUrl.trim()}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex-shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Connect
            </button>
          </form>
          {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        </div>
      )}

      {/* Stats row */}
      {icalUrl && events.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Upcoming</p>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{upcoming.length}</p>
            <p className="text-xs text-gray-400 mt-1">events total</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl shadow-sm px-5 py-4">
            <p className="text-xs font-medium text-red-400 uppercase tracking-wide mb-1">Tests & Quizzes</p>
            <p className="text-3xl font-bold text-red-600 tabular-nums">{testCount}</p>
            <p className="text-xs text-red-400 mt-1">coming up</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm px-5 py-4">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide mb-1">Assignments</p>
            <p className="text-3xl font-bold text-indigo-700 tabular-nums">{assignCount}</p>
            <p className="text-xs text-indigo-400 mt-1">due upcoming</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {icalUrl && events.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {(["all", "test", "assignment", "event", "other"] as const).map(f => (
            <button key={f} onClick={() => setFilterType(f)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors capitalize border ${
                filterType === f
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
              }`}>
              {f === "all" ? "All" : TYPE_CONFIG[f].label}
            </button>
          ))}
          <label className="flex items-center gap-1.5 ml-auto text-xs text-gray-400 cursor-pointer select-none">
            <input type="checkbox" checked={showPast} onChange={e => setShowPast(e.target.checked)}
              className="w-3.5 h-3.5 accent-indigo-600" />
            Show past
          </label>
        </div>
      )}

      {/* Error (when URL exists) */}
      {error && icalUrl && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          <p className="text-sm">Loading your Schoology calendar…</p>
        </div>
      )}

      {/* Event list */}
      {!loading && icalUrl && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {grouped.size === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">No upcoming events</p>
              <p className="text-xs mt-1">
                {filterType !== "all" ? "Try changing the filter." : showPast ? "Nothing found in your calendar." : "Turn on \"Show past\" to see previous events."}
              </p>
            </div>
          ) : (
            [...grouped.entries()].map(([day, dayEvents], dayIdx) => {
              const past = isPast(day);
              const todayDay = isToday(day);
              return (
                <div key={day} className={dayIdx > 0 ? "border-t border-gray-100" : ""}>
                  {/* Day header */}
                  <div className={`px-5 py-3 flex items-center gap-3 ${todayDay ? "bg-indigo-50" : past ? "bg-gray-50" : "bg-white"}`}>
                    <span className={`text-sm font-semibold ${todayDay ? "text-indigo-700" : past ? "text-gray-400" : "text-gray-800"}`}>
                      {formatDay(day)}
                    </span>
                    {todayDay && <span className="text-xs font-medium bg-indigo-600 text-white px-2 py-0.5 rounded-full">Today</span>}
                    <span className="text-xs text-gray-400 ml-auto">{dayEvents.length} {dayEvents.length === 1 ? "item" : "items"}</span>
                  </div>

                  {/* Events */}
                  {dayEvents.map(ev => {
                    const tc = TYPE_CONFIG[ev.type];
                    const Icon = tc.icon;
                    return (
                      <div key={ev.uid}
                        className={`flex items-start gap-3 px-5 py-3.5 border-t border-gray-50 ${past ? "opacity-60" : ""}`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border ${tc.bg}`}>
                          <Icon className={`w-3.5 h-3.5 ${tc.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${past ? "text-gray-500" : "text-gray-900"} truncate`}>{ev.title}</p>
                          {ev.course && ev.course !== ev.title && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">{ev.course}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${tc.bg} ${tc.color}`}>
                            {tc.label}
                          </span>
                          <p className="text-xs text-gray-400 mt-1">{formatTime(ev.start, ev.allDay)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Change URL link */}
      {icalUrl && (
        <p className="text-xs text-gray-400 mt-4 text-center">
          Calendar URL saved to this browser.{" "}
          <button onClick={() => { localStorage.removeItem(ICAL_KEY); setIcalUrl(""); setEvents([]); setError(""); }}
            className="underline hover:text-gray-600">
            Disconnect
          </button>
        </p>
      )}
    </div>
  );
}
