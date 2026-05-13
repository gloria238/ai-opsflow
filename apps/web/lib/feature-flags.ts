const FLAGS = {
  ai_suggestions: { env: "FEATURE_AI_SUGGESTIONS", default: true },
  ai_workflow_generation: { env: "FEATURE_AI_WORKFLOW_GEN", default: true },
  ai_lead_scoring: { env: "FEATURE_AI_LEAD_SCORING", default: true },
  ai_anomaly_detection: { env: "FEATURE_AI_ANOMALY_DETECTION", default: true },
  advanced_tables: { env: "FEATURE_ADVANCED_TABLES", default: true },
  realtime_updates: { env: "FEATURE_REALTIME", default: true },
} as const;

export type FeatureFlag = keyof typeof FLAGS;

export function isEnabled(flag: FeatureFlag): boolean {
  const config = FLAGS[flag];
  const envVal = process.env[config.env];
  if (envVal === undefined) return config.default;
  return envVal === "1" || envVal === "true";
}
