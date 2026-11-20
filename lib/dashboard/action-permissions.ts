export type DashboardRole = "admin" | "lead" | "organizer" | null;

export function getActionPermissions(role: DashboardRole) {
  const canManage = role === "admin" || role === "lead";

  return {
    canCreateActionItems: canManage,
    canEditActionItems: canManage,
    canReviewSuggestions: canManage,
    canSubmitSuggestions: role !== null,
  };
}
