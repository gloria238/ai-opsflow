"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  workflowId: string;
  workflowName: string;
  orgSlug: string;
}

export function DeleteWorkflowButton({ workflowId, workflowName, orgSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/workflows/${workflowId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Workflow deleted");
      router.push("/workflows");
    } catch {
      toast.error("Failed to delete workflow");
      setLoading(false);
    }
  }, [workflowId, orgSlug, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="destructive" size="sm">Delete</Button>
      </DialogTrigger>
      <DialogContent title="Delete Workflow">
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete <strong>{workflowName}</strong>? This will permanently remove all versions, nodes, and run history. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
