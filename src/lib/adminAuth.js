/**
 * ═══════════════════════════════════════════════════════════
 * ADMIN AUTH — Role check utilities for Admin Dashboard
 * ═══════════════════════════════════════════════════════════
 *
 * Uses Firestore user doc role field + client-side guard
 * Supports 3-tier RBAC: superadmin / admin / editor
 */

import { ADMIN_ROLES, ROLES } from "./permissions";

/**
 * Check if a user document has an admin-level role
 * (superadmin, admin, or editor can access the admin panel)
 * @param {Object|null} userData - User document from Firestore
 * @returns {boolean}
 */
export function isAdminUser(userData) {
  if (!userData) return false;
  return ADMIN_ROLES.includes(userData.role);
}

/**
 * Get the role string from user data, defaulting to "user"
 * @param {Object|null} userData
 * @returns {string}
 */
export function getUserRole(userData) {
  if (!userData?.role) return ROLES.USER;
  return userData.role;
}

/**
 * Admin-only fields that can be modified via admin dashboard
 * Matches Firestore Security Rules hasOnly() whitelist
 */
export const ADMIN_EDITABLE_USER_FIELDS = [
  "role",
  "currentStreak",
  "longestStreak",
  "learnedWords",
  "totalXp",
  "totalReviews",
  "totalLapses",
  "topicProgress",
  "premium",
  "lastSyncedAt",
  "lastChangeSource",
  "isBanned",
  "dailyGoal",
  "learningLevel",
  "forceSyncRequested",
];

/**
 * Validate that admin is only modifying allowed fields
 * @param {Object} changes - Fields being changed
 * @returns {{ valid: boolean, invalidFields: string[] }}
 */
export function validateAdminUpdate(changes) {
  const keys = Object.keys(changes);
  const invalidFields = keys.filter(
    (k) => !ADMIN_EDITABLE_USER_FIELDS.includes(k)
  );
  return {
    valid: invalidFields.length === 0,
    invalidFields,
  };
}
