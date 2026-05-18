import Link from "next/link";

const features = [
  {
    icon: "⚡",
    title: "Visual Workflow Builder",
    desc: "Drag and drop nodes to build multi-step automations. Trigger on schedules, webhooks, or lead events with branching logic and delays.",
  },
  {
    icon: "🤖",
    title: "AI-Powered Operations",
    desc: "AI scores leads, composes personalized emails, classifies responses, suggests improvements, and analyzes failures in real-time.",
  },
  {
    icon: "🔒",
    title: "Enterprise Security",
    desc: "JWT authentication, RBAC with 4 roles and 10 permissions, rate limiting, CSP/HSTS, PII-safe logging, and multi-tenant isolation.",
  },
  {
    icon: "📧",
    title: "Smart Email Automation",
    desc: "AI-composed welcome, follow-up, and outreach emails with open/click tracking. Auto-classify replies and trigger workflows.",
  },
  {
    icon: "📊",
    title: "Pipeline Analytics",
    desc: "Real-time conversion metrics across 6 stages. AI predicts deal closure and identifies pipeline bottlenecks.",
  },
  {
    icon: "🔌",
    title: "Developer-Friendly",
    desc: "38 REST API endpoints, webhook triggers, API keys, SSE streaming, BullMQ async jobs. Full API documentation included.",
  },
];

const steps = [
  { step: "1", title: "Connect your leads", desc: "Import via CSV or create manually. Organize by pipeline stage and custom tags." },
  { step: "2", title: "Build workflows", desc: "Use AI to generate workflows from plain English, or drag-and-drop on the visual canvas." },
  { step: "3", title: "Automate & analyze", desc: "Trigger manually, on schedule, or via webhooks. AI scores leads, composes emails, and tracks pipeline health." },
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
            <span className="font-bold text-lg tracking-tight">OpsFlow AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-text-secondary hover:text-text transition-colors duration-200 px-3 py-2">
              Sign in
            </Link>
            <Link href="/register"
              className="rounded-xl bg-accent text-white text-sm font-semibold px-4 py-2 hover:bg-accent-hover transition-all duration-200 shadow-sm shadow-accent/25 hover:shadow-md hover:shadow-accent/30">
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft border border-accent/10 px-4 py-1.5 text-sm font-medium text-accent mb-8 animate-fade-in">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-50" />
            <span className="relative inline-flex rounded-full size-2 bg-accent" />
          </span>
          AI-powered workflow automation
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight animate-slide-up">
          Automate your sales ops{" "}
          <span className="bg-gradient-to-r from-accent to-accent bg-clip-text text-transparent [background-clip:text] [-webkit-background-clip:text]">
            with AI
          </span>
        </h1>
        <p className="mt-6 text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: "50ms" }}>
          OpsFlow combines CRM, visual workflow automation, and AI intelligence into one platform. Score leads, compose emails, classify responses, and run multi-step automations — all powered by AI.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <Link href="/register"
            className="rounded-xl bg-accent text-white font-semibold px-6 py-3 hover:bg-accent-hover transition-all duration-200 shadow-sm shadow-accent/25 hover:shadow-md hover:shadow-accent/30 active:scale-[0.98]">
            Start free trial
          </Link>
          <Link href="/login"
            className="rounded-xl border border-border bg-bg-card text-text-secondary font-semibold px-6 py-3 hover:bg-bg-subtle transition-all duration-200">
            Sign in
          </Link>
        </div>
        <p className="mt-4 text-xs text-text-muted animate-fade-in" style={{ animationDelay: "150ms" }}>
          No credit card required. Free plan includes 100 workflow runs/month.
        </p>
      </section>

      {/* Features grid */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4 tracking-tight">Everything your sales team needs</h2>
        <p className="text-text-secondary text-center mb-12 max-w-xl mx-auto">
          From lead scoring to email automation, OpsFlow AI handles the busywork so your team can focus on closing deals.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={f.title} className="glass-card p-6 group cursor-default"
              style={{ animationDelay: `${i * 50}ms` }}>
              <div className="size-11 rounded-2xl bg-accent-soft flex items-center justify-center text-xl mb-4 group-hover:scale-105 transition-transform duration-300">
                {f.icon}
              </div>
              <h3 className="font-semibold text-text mb-2">{f.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-bg-subtle/50 border-y border-border py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12 tracking-tight">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((item) => (
              <div key={item.step} className="text-center group">
                <div className="size-12 rounded-2xl bg-accent text-white flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-sm shadow-accent/25 group-hover:shadow-md group-hover:shadow-accent/30 transition-shadow duration-300">
                  {item.step}
                </div>
                <h3 className="font-semibold text-text mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-bold tracking-tight mb-4">Ready to automate your sales ops?</h2>
        <p className="text-text-secondary mb-8 text-lg">Join teams using OpsFlow to score leads, send AI-composed emails, and close deals faster.</p>
        <Link href="/register"
          className="inline-flex rounded-xl bg-accent text-white font-semibold px-8 py-3.5 hover:bg-accent-hover transition-all duration-200 shadow-sm shadow-accent/25 hover:shadow-md hover:shadow-accent/30 active:scale-[0.98] text-lg">
          Get started free
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <span>&copy; 2026 OpsFlow AI. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="hover:text-text-secondary transition-colors">API Docs</Link>
            <Link href="/login" className="hover:text-text-secondary transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
