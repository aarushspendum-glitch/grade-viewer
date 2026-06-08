import Link from "next/link";
import { BarChart3, Edit3, Target, BookOpen, ArrowRight, TrendingUp } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-100 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-gray-900 text-lg tracking-tight">GradeView</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
            Sign in
          </Link>
          <Link
            href="/login"
            className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-8 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-medium px-3.5 py-1.5 rounded-full mb-8">
          <TrendingUp className="w-3.5 h-3.5" />
          Built for FCPS students, works everywhere
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight leading-tight mb-6">
          Your grades,{" "}
          <span className="text-indigo-600">actually useful</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Connect your StudentVUE account and get a clean view of your grades, GPA, and what you need to score on that next test.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Connect my grades
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="text-gray-600 hover:text-gray-900 font-medium px-6 py-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: BarChart3,
              color: "bg-blue-50 text-blue-600",
              title: "Live grade sync",
              desc: "Pulls directly from StudentVUE. Always up to date, no manual entry.",
            },
            {
              icon: Edit3,
              color: "bg-violet-50 text-violet-600",
              title: "What-if editor",
              desc: "Model any score before it happens. See exactly how it shifts your average.",
            },
            {
              icon: Target,
              color: "bg-emerald-50 text-emerald-600",
              title: "GPA optimizer",
              desc: "Set a target GPA and find the minimum improvement needed in each class.",
            },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div
              key={title}
              className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`inline-flex rounded-xl p-2.5 mb-4 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        GradeView — your password never leaves your device.
      </footer>
    </main>
  );
}
