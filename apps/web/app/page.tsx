import Link from "next/link";

const features = [
  {
    icon: "⚡",
    title: "AI Workflow Automation",
    desc: "Build multi-step workflows with delays, branching, AI scoring, and async execution. Trigger on schedules, webhooks, or lead events.",
  },
  {
    icon: "📊",
    title: "Lead Operations",
    desc: "Automatically score leads, classify replies, generate follow-ups, and track pipeline health across 6 stages in real time.",
  },
  {
    icon: "📧",
    title: "Smart Email Sequences",
    desc: "AI-composed welcome, follow-up, and re-engagement emails with open and click tracking. Auto-classify responses.",
  },
  {
    icon: "🔍",
    title: "Operational Monitoring",
    desc: "Track every workflow run, retry, and failure in real time. Monitor worker health and queue depth from a live dashboard.",
  },
  {
    icon: "🏗️",
    title: "Multi-Tenant Workspaces",
    desc: "Role-based access with 4 permission levels. Isolated workspaces, organization switching, and team collaboration built in.",
  },
  {
    icon: "🔌",
    title: "API & Webhooks",
    desc: "REST API for programmatic access, webhook triggers for external events, and SSE streaming for real-time execution visibility.",
  },
];

const useCases = [
  {
    title: "Lead Qualification",
    desc: "AI scores inbound leads on engagement, budget signals, and fit. High-intent leads get routed to sales reps instantly.",
  },
  {
    title: "AI Follow-up Sequences",
    desc: "Personalized emails drafted by AI, triggered by lead stage changes. Responses are auto-classified and routed.",
  },
  {
    title: "Customer Onboarding",
    desc: "Multi-step onboarding workflows with scheduled emails, reminders, and task assignments. Track completion in real time.",
  },
  {
    title: "Pipeline Health Monitoring",
    desc: "Real-time conversion metrics across stages. AI flags bottlenecks and predicts which deals are most likely to close.",
  },
];

const audiences = [
  "AI agencies", "SaaS startups", "Outbound sales teams",
  "RevOps teams", "Internal automation systems",
];

const credibility = [
  { label: "Async Queue Orchestration", detail: "BullMQ" },
  { label: "Real-time Execution Monitoring", detail: "SSE streaming" },
  { label: "Multi-tenant RBAC", detail: "4 roles, 10 permissions" },
  { label: "Distributed Workers", detail: "Stateless, horizontally scalable" },
  { label: "AI Pipeline Integration", detail: "DeepSeek, prompt caching" },
  { label: "Production Database", detail: "PostgreSQL + Prisma ORM" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Glass navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-glass-bg backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="size-8 rounded-xl bg-accent flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-accent/25 group-hover:shadow-md group-hover:shadow-accent/30 transition-shadow duration-300">
              O
            </div>
            <span className="font-bold text-lg tracking-tight">OpsFlow</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-text-secondary hover:text-text transition-colors duration-200 px-3 py-2">
              Sign in
            </Link>
            <Link href="/register"
              className="rounded-xl bg-accent text-white text-sm font-semibold px-4 py-2 hover:bg-accent-hover transition-all duration-200 shadow-sm shadow-accent/25 hover:shadow-md hover:shadow-accent/30">
              Start building
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft border border-accent/10 px-4 py-1.5 text-sm font-medium text-accent mb-8 animate-fade-in">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-50" />
            <span className="relative inline-flex rounded-full size-2 bg-accent" />
          </span>
          AI-native operations platform
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight animate-slide-up text-center">
          Run your sales operations{" "}
          <span className="bg-gradient-to-r from-accent to-accent bg-clip-text text-transparent [background-clip:text] [-webkit-background-clip:text]">
            on autopilot
          </span>
        </h1>
        <p className="mt-6 text-lg text-text-secondary max-w-xl mx-auto leading-relaxed animate-slide-up text-center" style={{ animationDelay: "50ms" }}>
          Lead scoring, workflow automation, AI-assisted outreach, and operational monitoring — built for teams that need to move faster with fewer people.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <Link href="/register"
            className="rounded-xl bg-accent text-white font-semibold px-6 py-3 hover:bg-accent-hover transition-all duration-200 shadow-sm shadow-accent/25 hover:shadow-md hover:shadow-accent/30 active:scale-[0.98]">
            Start building workflows
          </Link>
          <Link href="/login"
            className="rounded-xl border border-border bg-bg-card text-text-secondary font-semibold px-6 py-3 hover:bg-bg-subtle transition-all duration-200">
            Sign in
          </Link>
        </div>
        <p className="mt-4 text-xs text-text-muted animate-fade-in" style={{ animationDelay: "150ms" }}>
          Free to start. No credit card required.
        </p>
      </section>

      {/* Trusted by / built for */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <p className="text-xs font-medium text-text-muted uppercase tracking-widest text-center mb-5">Built for</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {audiences.map((a) => (
            <span key={a} className="rounded-full bg-bg-subtle border border-border px-4 py-1.5 text-sm text-text-secondary">
              {a}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 tracking-tight">Everything your team needs to automate sales ops</h2>
        <p className="text-text-secondary text-center mb-12 max-w-lg mx-auto text-sm">
          From lead scoring to email automation — the busywork handled, so your team focuses on closing.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={f.title} className="glass-card p-5 group"
              style={{ animationDelay: `${i * 50}ms` }}>
              <div className="size-10 rounded-xl bg-accent-soft flex items-center justify-center text-lg mb-3 group-hover:scale-105 transition-transform duration-300">
                {f.icon}
              </div>
              <h3 className="font-semibold text-text mb-1.5 text-sm">{f.title}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Example workflows */}
      <section className="bg-bg-subtle/50 border-y border-border py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 tracking-tight">How teams use OpsFlow</h2>
          <p className="text-text-secondary text-center mb-12 max-w-lg mx-auto text-sm">
            Real workflows that replace hours of manual work with automated, AI-assisted processes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {useCases.map((item) => (
              <div key={item.title} className="glass-card p-5">
                <h3 className="font-semibold text-text mb-1.5 text-sm">{item.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credibility — Built like a production SaaS */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 tracking-tight">Built like a production SaaS</h2>
        <p className="text-text-secondary text-center mb-10 max-w-lg mx-auto text-sm">
          Not a demo. Production-grade architecture designed for real workloads.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {credibility.map((item) => (
            <div key={item.label} className="glass-card p-4 text-center">
              <p className="text-xs text-text-muted mb-1">{item.label}</p>
              <p className="text-sm font-semibold text-text">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Ready to automate your operations?</h2>
        <p className="text-text-secondary mb-8 text-sm max-w-md mx-auto">
          Start building AI-assisted workflows, scoring leads, and monitoring operations in minutes.
        </p>
        <Link href="/register"
          className="inline-flex rounded-xl bg-accent text-white font-semibold px-8 py-3.5 hover:bg-accent-hover transition-all duration-200 shadow-sm shadow-accent/25 hover:shadow-md hover:shadow-accent/30 active:scale-[0.98] text-base">
          Start building workflows
        </Link>
        <p className="mt-4 text-xs text-text-muted">
          Free to start. Upgrade when you need more runs.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <span>&copy; 2026 OpsFlow. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="hover:text-text-secondary transition-colors">API Docs</Link>
            <Link href="/login" className="hover:text-text-secondary transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
