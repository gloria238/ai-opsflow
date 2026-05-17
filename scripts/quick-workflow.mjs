// Create & run a simple workflow that succeeds in ~1 second.
// Usage: node scripts/quick-workflow.mjs

const BASE = "http://localhost:3000";
const ORG = "alice-workspace";

async function main() {
  // 1. Login
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@opsflow.test", password: "test123456" }),
  });
  const cookie = login.headers.get("set-cookie")?.match(/session=([^;]+)/)?.[0];
  if (!cookie) { console.error("Login failed:", login.status); return; }
  console.log("1. Logged in as admin");

  // 2. Create workflow
  const wf = await fetch(`${BASE}/api/orgs/${ORG}/workflows`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      name: "Instant Lead Qualifier",
      description: "Trigger → update lead stage to qualified. Completes in <1s.",
    }),
  });
  const wfData = await wf.json();
  console.log(`2. Created workflow: ${wfData.id}`);

  // 3. Save canvas: trigger → update_lead (set stage=qualified)
  const nodes = [
    { id: "t1", type: "trigger", label: "New Lead", config: { type: "manual" }, positionX: 250, positionY: 50 },
    { id: "a1", type: "action", label: "Mark as Qualified", config: { action: "update_lead", stage: "qualified" }, positionX: 250, positionY: 200 },
  ];
  const edges = [{ sourceNodeId: "t1", targetNodeId: "a1" }];
  await fetch(`${BASE}/api/orgs/${ORG}/workflows/${wfData.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ nodes, edges }),
  });
  console.log("3. Canvas saved: trigger → update_lead(qualified)");

  // 4. Create a test lead
  const lead = await fetch(`${BASE}/api/orgs/${ORG}/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ name: "Test Lead", email: "test@example.com", stage: "new" }),
  });
  const leadData = await lead.json();
  console.log(`4. Created lead: ${leadData.id} (stage: new)`);

  // 5. Trigger workflow
  const run = await fetch(`${BASE}/api/orgs/${ORG}/workflows/${wfData.id}/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ input: { leadId: leadData.id } }),
  });
  const runData = await run.json();
  console.log(`5. Triggered! Run: ${runData.id} (status: ${runData.status})`);

  // 6. Wait a moment and check
  await new Promise((r) => setTimeout(r, 2000));
  const check = await fetch(`${BASE}/api/orgs/${ORG}/workflows/${wfData.id}/runs`, { headers: { cookie } });
  const runs = await check.json();
  const latest = runs[0];
  console.log(`6. Run status: ${latest?.status}${latest?.status === "completed" ? " ✅" : ""}`);

  // 7. Verify lead was updated
  const leadCheck = await fetch(`${BASE}/api/orgs/${ORG}/leads/${leadData.id}`, { headers: { cookie } });
  const leadFinal = await leadCheck.json();
  console.log(`7. Lead stage: ${leadFinal.stage}${leadFinal.stage === "qualified" ? " ✅" : ""}`);
}

main().catch(console.error);
