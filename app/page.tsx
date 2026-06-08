import Link from "next/link";
import { GraduationCap, BarChart3, Sparkles, Edit3 } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-24 flex flex-col items-center text-center gap-12">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 bg-violet-500/20 border border-violet-400/30 rounded-full px-4 py-1.5 text-violet-300 text-sm">
            <Sparkles className="w-3.5 h-3.5" />
            StudentVUE, but actually good
          </div>
          <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent">
            GradeView
          </h1>
          <p className="text-xl text-slate-400 max-w-xl">
            Connect your school account, visualize your grades, run what-if scenarios, and optimize your GPA — all in one beautiful place.
          </p>
        </div>

        <div className="flex gap-4">
          <Link
            href="/login"
            className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Sign In
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4">
          {[
            {
              icon: GraduationCap,
              title: "Real Grades",
              desc: "Pull live data from StudentVUE — FCPS, LCPS, PWCS and more.",
            },
            {
              icon: Edit3,
              title: "What-If Editor",
              desc: "Edit any grade privately to model test results before they happen.",
            },
            {
              icon: BarChart3,
              title: "GPA Calculator",
              desc: "Weighted & unweighted GPA with AP/Honors/DE support.",
            },
            {
              icon: Sparkles,
              title: "GPA Optimizer",
              desc: "Find the minimum grade improvement needed to hit your target GPA.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left flex gap-4"
            >
              <div className="bg-violet-500/20 rounded-xl p-2.5 h-fit">
                <Icon className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{title}</h3>
                <p className="text-slate-400 text-sm">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
