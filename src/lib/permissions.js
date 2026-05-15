/**
 * ═══════════════════════════════════════════════════════════
 * PERMISSIONS — Role-Based Access Control (RBAC) for Admin
 * ═══════════════════════════════════════════════════════════
 *
 * 3-tier role system:
 *   superadmin — Full access, manages roles & system settings
 *   admin      — Content + user management, no system settings
 *   editor     — Content only (vocabulary + topics), read-only elsewhere
 */

// ────────────────────────────────────────────
//  ROLE DEFINITIONS
// ────────────────────────────────────────────

export const ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  EDITOR: "editor",
  USER: "user",
};

export const ROLE_LABELS = {
  superadmin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
  user: "User",
};

export const ROLE_COLORS = {
  superadmin: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200", dot: "bg-red-500" },
  admin: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", dot: "bg-blue-500" },
  editor: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", dot: "bg-amber-500" },
  user: { bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200", dot: "bg-gray-400" },
};

/** Roles that can access the admin panel */
export const ADMIN_ROLES = [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.EDITOR];

// ────────────────────────────────────────────
//  PERMISSIONS MAP
// ────────────────────────────────────────────

const ROLE_PERMISSIONS = {
  superadmin: ["*"], // Wildcard — full access

  admin: [
    "dashboard.view",
    "vocabulary.view", "vocabulary.create", "vocabulary.edit", "vocabulary.delete", "vocabulary.import",
    "topics.view", "topics.create", "topics.edit",
    "users.view",
    "sync.view",
    "logs.view",
    "feedback.view", "feedback.manage",
    "announcements.view", "announcements.manage",
    "flags.view",
  ],

  editor: [
    "dashboard.view",
    "vocabulary.view", "vocabulary.create", "vocabulary.edit",
    "topics.view", "topics.create", "topics.edit",
  ],
};

// ────────────────────────────────────────────
//  HELPERS
// ────────────────────────────────────────────

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission key (e.g. "vocabulary.delete")
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
  if (!role || !permission) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.includes("*")) return true;
  return perms.includes(permission);
}

/**
 * Check if a role can access the admin panel at all
 * @param {string} role
 * @returns {boolean}
 */
export function canAccessAdmin(role) {
  return ADMIN_ROLES.includes(role);
}

/**
 * Check if a role is higher or equal to another
 * superadmin > admin > editor > user
 */
const ROLE_HIERARCHY = { superadmin: 3, admin: 2, editor: 1, user: 0 };

export function isRoleHigherOrEqual(roleA, roleB) {
  return (ROLE_HIERARCHY[roleA] || 0) >= (ROLE_HIERARCHY[roleB] || 0);
}

// ────────────────────────────────────────────
//  NAV PERMISSIONS — which sidebar items each role sees
// ────────────────────────────────────────────

export const NAV_PERMISSIONS = {
  "/admin": "dashboard.view",
  "/admin/vocabulary": "vocabulary.view",
  "/admin/topics": "topics.view",
  "/admin/users": "users.view",
  "/admin/sync": "sync.view",
  "/admin/logs": "logs.view",
  "/admin/settings": "settings.view", // superadmin only (wildcard covers it)
  "/admin/feedback": "feedback.view",
  "/admin/announcements": "announcements.view",
  "/admin/flags": "flags.view",
};
