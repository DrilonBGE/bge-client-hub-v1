import type { TodoRow } from "@/lib/bge";

export const PRIORITIES = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export type TaskRow = TodoRow & {
  priority?: string | null;
  issued_by?: string | null;
  source?: string | null;
  detail?: string | null;
};

export function priorityStyle(priority: string | null | undefined) {
  switch ((priority ?? "medium").toLowerCase()) {
    case "high":
      return { label: "High", colour: "var(--destructive)" };
    case "low":
      return { label: "Low", colour: "var(--info)" };
    default:
      return { label: "Medium", colour: "var(--warning)" };
  }
}

export function priorityRank(priority: string | null | undefined) {
  const key = (priority ?? "medium").toLowerCase();
  return key === "high" ? 0 : key === "low" ? 2 : 1;
}

/** Where the task came from: a person, or the software reacting to a client. */
export function sourceLabel(source: string | null | undefined) {
  return (source ?? "manual") === "client" ? "Client set the task" : "Team";
}

export function daysLeft(due: string | null | undefined) {
  if (!due) return null;
  const parsed = new Date(due);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((parsed.getTime() - start.getTime()) / 86400000);
}

export function shortDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function sortTasks(rows: TaskRow[]) {
  return [...rows].sort((a, b) => {
    const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
    if (byPriority !== 0) return byPriority;
    const dueA = a.due_date ?? "9999";
    const dueB = b.due_date ?? "9999";
    return dueA.localeCompare(dueB);
  });
}
