import Link from "next/link";

const features = [
  {
    icon: "⚡",
    title: "AI Workflow Automation",
    desc: "Build multi-step workflows with delays, branching, AI scoring, and async execution. Trigger on schedules, webhooks, or lead events.",
  },
  {
    icon: "🔍",
    title: "Operational Monitoring",
    desc: "Track every workflow run, retry, and failure in real time. Monitor worker health and queue depth from a live operational dashboard.",
  },
  {
    icon: "📊",
    title: "Lead Operations",
    desc: "Automatically score leads, classify replies, generate follow-ups, and track pipeline health across 6 stages in real time.",
  },
  {
    icon: "🏗️",
    title: "Multi-Tenant Workspaces",
    desc: "Role-based access with 4 permission levels. Isolated workspaces, organization switching, and secure team collaboration built in.",
  },
  {
    icon: "📧",
    title: "Smart Email Sequences",
    desc: "AI-composed welcome, follow-up, and re-engagement emails with open and click tracking. Auto-classify responses and trigger workflows.",
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
  { label: "AI Agencies", icon: "🤖" },
  { label: "SaaS Startups", icon: "🚀" },
  { label: "Outbound Teams", icon: "📨" },
  { label: "RevOps", icon: "📈" },
  { label: "Internal Tools", icon: "⚙️" },
  { label: "Automation Systems", icon: "🔄" },
];

const credibility = [
  { label: "Async Queue Orchestration", desc: "Background execution with retries, delayed jobs, and failure recovery." },
  { label: "Real-time Monitoring", desc: "Live execution visibility with streaming updates and operational dashboards." },
  { label: "Multi-tenant RBAC", desc: "Secure organization isolation with scoped permissions and workspace management." },
  { label: "Distributed Workers", desc: "Horizontally scalable background processing architecture." },
  { label: "AI Pipeline Integration", desc: "AI-assisted lead scoring, workflow generation, and operational analysis." },
  { label: "PostgreSQL + Prisma ORM", desc: "Production-grade database with type-safe queries and schema migrations." },
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

      {/* Hero — more whitespace */}
      <section className="max-w-2xl mx-auto px-6 pt-32 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft border border-accent/10 px-4 py-1.5 text-sm font-medium text-accent mb-8 animate-fade-in">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-50" />
            <span className="relative inline-flex rounded-full size-2 bg-accent" />
          </span>
          AI-native operations platform
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight animate-slide-up">
          Run your sales operations{" "}
          <span className="bg-gradient-to-r from-accent to-accent bg-clip-text text-transparent [background-clip:text] [-webkit-background-clip:text]">
            on autopilot
          </span>
        </h1>
        <p className="mt-6 text-lg text-text-secondary max-w-lg mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: "50ms" }}>
          Lead scoring, workflow orchestration, async automation, and AI-assisted outreach — unified into one operational workspace.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <Link href="/register"
            className="rounded-xl bg-accent text-white font-semibold px-6 py-3 hover:bg-accent-hover transition-all duration-200 shadow-sm shadow-accent/25 hover:shadow-md hover:shadow-accent/30 active:scale-[0.98]">
            Start building workflows
          </Link>
          <Link href="/login"
            className="rounded-xl border border-border bg-bg-card text-text font-semibold px-6 py-3 hover:bg-bg-subtle transition-all duration-200">
            Sign in
          </Link>
        </div>
        <p className="mt-5 text-xs text-text-muted animate-fade-in" style={{ animationDelay: "150ms" }}>
          Free to start. No credit card required.
        </p>
      </section>

      {/* Built for — visual pills */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest text-center mb-6">Built for</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {audiences.map((a) => (
            <div key={a.label} className="glass-card p-3 text-center group cursor-default">
              <div className="text-lg mb-1 group-hover:scale-110 transition-transform duration-200">{a.icon}</div>
              <p className="text-xs font-medium text-text-secondary">{a.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features — reordered, more spacing */}
      <section className="max-w-5xl mx-auto px-6 pb-32">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest text-center mb-4">Capabilities</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 tracking-tight">Operational infrastructure for modern GTM teams</h2>
        <p className="text-text-secondary text-center mb-16 max-w-lg mx-auto text-sm leading-relaxed">
          AI-assisted systems purpose-built for high-velocity teams that need more than a CRM.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={f.title} className="glass-card p-6 group"
              style={{ animationDelay: `${i * 50}ms` }}>
              <div className="size-10 rounded-xl bg-accent-soft flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform duration-300">
                {f.icon}
              </div>
              <h3 className="font-semibold text-text mb-2 text-sm">{f.title}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Example workflows — darker contrast block */}
      <section className="bg-bg-subtle/70 border-y border-border py-24">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest text-center mb-4">Use Cases</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 tracking-tight">How teams use OpsFlow</h2>
          <p className="text-text-secondary text-center mb-14 max-w-lg mx-auto text-sm leading-relaxed">
            Real workflows that replace hours of manual work with automated, AI-assisted processes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {useCases.map((item) => (
              <div key={item.title} className="glass-card p-6">
                <h3 className="font-semibold text-text mb-2 text-sm">{item.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credibility — tech + business value, not engineering resume */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest text-center mb-4">Architecture</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 tracking-tight">Built like a production SaaS</h2>
        <p className="text-text-secondary text-center mb-4 max-w-lg mx-auto text-sm leading-relaxed">
          Inspired by how modern operational SaaS platforms are architected. Not a demo — production-grade infrastructure designed for real workloads.
        </p>
        <p className="text-xs text-text-muted text-center mb-12">
          Designed to reflect real production operational systems
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {credibility.map((item) => (
            <div key={item.label} className="glass-card p-5 text-left">
              <p className="text-sm font-semibold text-text mb-1.5">{item.label}</p>
              <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA — more breathing room */}
      <section className="max-w-xl mx-auto px-6 pb-32 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">Ready to automate your operations?</h2>
        <p className="text-text-secondary mb-10 text-sm max-w-md mx-auto leading-relaxed">
          Start building AI-assisted workflows, scoring leads, and monitoring operations in minutes.
        </p>
        <Link href="/register"
          className="inline-flex rounded-xl bg-accent text-white font-semibold px-8 py-3.5 hover:bg-accent-hover transition-all duration-200 shadow-sm shadow-accent/25 hover:shadow-md hover:shadow-accent/30 active:scale-[0.98] text-base">
          Start building workflows
        </Link>
        <p className="mt-5 text-xs text-text-muted">
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
