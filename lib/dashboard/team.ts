export const TEAMS = [
    "web",
    "marketing",
    "logistics",
    "sponsorship",
    "branding",
] as const;

export type Team = (typeof TEAMS)[number];

export function isTeam(value: unknown): value is Team {
    return typeof value === "string" && TEAMS.some((team) => team === value);
}

export function teamLabel(team: Team): string {
    return team.charAt(0).toUpperCase() + team.slice(1);
}
