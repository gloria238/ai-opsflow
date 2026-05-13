export const ROLES = ["owner", "admin", "operator", "viewer"] as const;
export type Role = (typeof ROLES)[number];

const PERMISSION_MAP: Record<string, Role[]> = {
  manage_org: ["owner", "admin"],
  manage_members: ["owner", "admin"],
  manage_workflows: ["owner", "admin", "operator"],
  manage_leads: ["owner", "admin", "operator"],
  view_workflows: ["owner", "admin", "operator", "viewer"],
  view_leads: ["owner", "admin", "operator", "viewer"],
  run_workflows: ["owner", "admin", "operator"],
};

export type Permission = keyof typeof PERMISSION_MAP;

export function hasPermission(role: string, permission: Permission): boolean {
  const allowed = PERMISSION_MAP[permission];
  if (!allowed) return false;
  return allowed.includes(role as Role);
}

export function requirePermission(role: string, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error("Forbidden");
  }
}
