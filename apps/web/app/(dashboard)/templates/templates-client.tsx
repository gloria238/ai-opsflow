"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface TemplateNode {
  id: string; type: string; label: string;
  config: Record<string, unknown>;
  positionX: number; positionY: number;
}

interface Template {
  slug: string;
  name: string;
  description: string;
  nodes: TemplateNode[];
  edges: { sourceNodeId: string; targetNodeId: string; sourceHandle?: string | null }[];
}

interface Props {
  orgSlug: string;
  canManage: boolean;
}

export function TemplatesClient({ orgSlug, canManage }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/orgs/${orgSlug}/templates`)
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(() => toast.error("Failed to load templates"))
      .finally(() => setLoading(false));
  }, [orgSlug]);

  const install = useCallback(async (slug: string) => {
    setInstalling(slug);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Install failed");
      }
      const workflow = await res.json();
      toast.success("Template installed!");
      router.push(`/workflows/${workflow.id}/builder`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to install template");
    } finally {
      setInstalling(null);
    }
  }, [orgSlug, router]);

  const nodeTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      trigger: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      action: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      condition: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      delay: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    };
    return (
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colors[type] || "bg-gray-100 text-gray-600"}`}>
        {type}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Workflow Templates</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Workflow Templates</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        Pre-built workflows ready to install. Each template includes nodes with valid configurations — install and start using immediately.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((t) => (
          <div key={t.slug} className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden hover:shadow-card-hover transition-shadow">
            <div className="p-5">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-1.5">{t.name}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 line-clamp-3">{t.description}</p>

              <div className="flex flex-wrap gap-1 mb-4">
                {Array.from(new Set(t.nodes.map((n) => n.type))).map((type) => (
                  <span key={type}>{nodeTypeBadge(type)}</span>
                ))}
                <Badge variant="default" className="text-[10px]">{t.nodes.length} nodes</Badge>
              </div>

              <button
                onClick={() => install(t.slug)}
                disabled={!canManage || installing !== null}
                className="w-full rounded-lg bg-blue-600 text-white text-sm font-medium py-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {installing === t.slug ? "Installing..." : canManage ? "Install Template" : "View only"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          <p>No templates available yet.</p>
        </div>
      )}

      <div className="mt-8 p-4 rounded-lg border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Tip:</strong> After installing a template, customize it in the workflow builder.
          Change email addresses in &quot;To&quot; fields, adjust delays, and modify conditions to fit your sales process.
          Trigger the workflow with a lead to see AI-powered automation in action.
        </p>
      </div>
    </div>
  );
}
