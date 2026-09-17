import type { Database } from "@/integrations/supabase/types";

export type TaskRow = Database["public"]["Tables"]["client_tasks"]["Row"];
export type DelayRow = Database["public"]["Tables"]["client_delays"]["Row"];
export type StrategyRow = Database["public"]["Tables"]["strategy_versions"]["Row"];
export type IssueRow = Database["public"]["Tables"]["client_issues"]["Row"];
export type RequestRow = Database["public"]["Tables"]["client_requests"]["Row"];
export type UploadRow = Database["public"]["Tables"]["client_uploads"]["Row"];
export type ApprovalRow = Database["public"]["Tables"]["client_approvals"]["Row"];
export type DeliveryRow = Database["public"]["Tables"]["delivery_log"]["Row"];
export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type InviteRow = Database["public"]["Tables"]["client_invites"]["Row"];
export type PauseRow = Database["public"]["Tables"]["client_pauses"]["Row"];

/** Common reasons a journey slips, with room to type your own. */
export const DELAY_REASONS = [
  "Waiting on documents",
  "Waiting on recordings",
  "Waiting on copy review",
  "Meta / ad account",
  "Payment",
  "Holiday",
  "Other",
] as const;

export const STATUSES = [
  { key: "to_come", label: "To come", colour: "var(--light-text)" },
  { key: "in_progress", label: "In progress", colour: "var(--phase-2)" },
  { key: "waiting_client", label: "Waiting on client", colour: "var(--warning)" },
  { key: "waiting_team", label: "Waiting on us", colour: "var(--phase-5)" },
  { key: "done", label: "Done", colour: "var(--success)" },
  { key: "other", label: "Other", colour: "var(--light-text)" },
] as const;

export type TaskStatus = (typeof STATUSES)[number]["key"];

export const PRIORITIES = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

/**
 * Priority climbs on its own as the deadline closes in, unless someone has
 * already marked it high by hand.
 */
export function effectivePriority(task: {
  priority: string;
  status: string;
  expected_date?: string | null;
}): { priority: Priority; escalated: boolean } {
  const set = (PRIORITIES as readonly string[]).includes(task.priority)
    ? (task.priority as Priority)
    : "medium";
  if (set === "high" || task.status === "done") return { priority: set, escalated: false };
  const days = daysTo(task.expected_date);
  if (days === null) return { priority: set, escalated: false };
  if (days <= 2) return { priority: "high", escalated: true };
  if (days <= 5 && set === "low") return { priority: "medium", escalated: true };
  return { priority: set, escalated: false };
}

export const HEALTH = [
  { key: "green", label: "On track", colour: "var(--success)" },
  { key: "amber", label: "Needs attention", colour: "var(--warning)" },
  { key: "red", label: "At risk", colour: "var(--destructive)" },
] as const;

export const DIFFICULTY = ["Easy", "Normal", "Demanding", "Very demanding"] as const;

export const DELAY_CAUSES = [
  { key: "client", label: "Client caused" },
  { key: "team", label: "We caused" },
  { key: "other", label: "Something else" },
] as const;

/** Working agreements from the client flow workbook. */
export const SLA_DAYS = { copy: 7, build: 3, review: 2 } as const;

export function statusMeta(status: string) {
  return STATUSES.find((s) => s.key === status) ?? STATUSES[5];
}

export function healthMeta(health: string | null | undefined) {
  return HEALTH.find((h) => h.key === health) ?? HEALTH[0];
}

export function priorityColour(priority: string) {
  if (priority === "high") return "var(--destructive)";
  if (priority === "low") return "var(--light-text)";
  return "var(--phase-2)";
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Whole days from today to an ISO date (negative = overdue). */
export function daysTo(date: string | null | undefined, now = new Date()): number | null {
  if (!date) return null;
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

export const OPEN_STATUSES: TaskStatus[] = [
  "to_come",
  "in_progress",
  "waiting_client",
  "waiting_team",
];

export function isOpen(task: TaskRow) {
  return OPEN_STATUSES.includes(task.status as TaskStatus);
}

export type WatchTone = "overdue" | "today" | "soon" | "waiting" | "ok";

/** Decides how loudly a task should shout on the "nothing gets forgotten" list. */
export function watchTone(task: TaskRow): WatchTone {
  if (!isOpen(task)) return "ok";
  const days = daysTo(task.expected_date);
  if (days !== null && days < 0) return "overdue";
  if (days !== null && days === 0) return "today";
  if (days !== null && days <= 3) return "soon";
  if (task.status === "waiting_client" || task.status === "waiting_team") return "waiting";
  return "ok";
}

export const TONE_STYLES: Record<WatchTone, { label: string; colour: string }> = {
  overdue: { label: "Overdue", colour: "var(--destructive)" },
  today: { label: "Due today", colour: "var(--destructive)" },
  soon: { label: "Due soon", colour: "var(--warning)" },
  waiting: { label: "Waiting", colour: "var(--phase-5)" },
  ok: { label: "On track", colour: "var(--success)" },
};

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}
