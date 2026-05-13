// apps/web/hooks/useWorkflowRun.ts
import { useEffect, useState } from "react";

export function useWorkflowRun(workflowId: string) {
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await fetch(`/api/orgs/demo-org/workflows/${workflowId}/runs`).then(res => res.json());
      setRuns(data);
    }, 3000);
    return () => clearInterval(interval);
  }, [workflowId]);

  return runs;
}
