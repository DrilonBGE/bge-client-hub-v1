import type { Database } from "@/integrations/supabase/types";

export type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
export type PhaseTaskRow = Database["public"]["Tables"]["phase_tasks"]["Row"];
export type TeamLinkRow = Database["public"]["Tables"]["team_links"]["Row"];
export type TeamMemberRow = Database["public"]["Tables"]["team_members"]["Row"];
export type TodoRow = Database["public"]["Tables"]["global_todos"]["Row"];
export type AuditRow = Database["public"]["Tables"]["audit_log"]["Row"];

export type PhaseTask = { t: string; n?: string; o?: string };
export type CustomTask = { id: string; t: string; done: boolean };
export type ClientDoc = { id: string; type: string; name: string; url: string; added?: string };
export type WebLink = {
  id: string;
  label: string;
  url: string;
  group?: string;
  submitted_by?: "client" | "bge";
};
export type CallReview = {
  id: string;
  type: string;
  date: string;
  who: string;
  drive: string;
  fathom: string;
  notes: string;
  client_tasks: string;
  team_tasks: string;
  client_extra_notes?: string;
};
export type Evidence = { id: string; name: string; url: string };
export type Results = Record<string, string | Evidence[] | undefined>;

export type PhaseRow = Omit<PhaseTaskRow, "tasks"> & { tasks: PhaseTask[] };

export type Client = Omit<
  ClientRow,
  "tasks" | "custom_tasks" | "docs" | "web_links" | "call_reviews" | "results" | "fathom_links"
> & {
  tasks: Record<string, boolean>;
  custom_tasks: CustomTask[];
  docs: ClientDoc[];
  web_links: WebLink[];
  call_reviews: CallReview[];
  results: Results;
};

export const PHASE_COLOURS: Record<number, string> = {
  1: "var(--phase-1)",
  2: "var(--phase-2)",
  3: "var(--phase-3)",
  4: "var(--phase-4)",
  5: "var(--phase-5)",
  6: "var(--phase-6)",
};

/** The delivery tiers a client can be on, including the allowed combinations. */
export const PROGRAMS = ["DFY", "DFY/DWY", "DWY", "DWY/DBY", "DBY", "DFY/DWY/DBY"] as const;

/** Long labels used in menus and tooltips. */
export const PROGRAM_LABELS: Record<string, string> = {
  DFY: "Done for you",
  DWY: "Done with you",
  "DFY/DWY": "Done for you / Done with you",
  DBY: "Done by you",
  "DWY/DBY": "Done with you / Done by you",
  "DFY/DWY/DBY": "Done for you / Done with you / Done by you",
};

/** Tier filters shown on the board. */
export const PROGRAM_TIERS = ["DFY", "DWY", "DBY"] as const;

/** How a client pays us. "Other" lets the team type the exact method. */
export const PAYMENT_METHODS = ["Wire transfer", "Crypto", "Stripe link", "Other"] as const;

/** Only these two write the video sales letters. */
export const VSL_WRITERS = ["William", "Waleed"] as const;

export function isCombinationProgram(program: string | null | undefined) {
  return !!program && program.includes("/");
}

export const TEAM = ["Drilon", "William", "Alfie", "Victor", "Waleed", "Lisa"] as const;

export const CALL_TYPES = [
  "1-to-1 Call",
  "Onboarding Call",
  "Strategy Call",
  "Review Call",
  "Renewal Call",
  "Ad-hoc Call",
] as const;

export const DOC_TYPES = ["Link", "Doc", "Sheet", "Slides", "PDF", "Video", "Other"] as const;

export const SUGGESTED_DOCS = [
  "Onboarding Form",
  "Offer Doc",
  "Client Avatar",
  "VSL Script",
  "Ad Creative Folder",
  "Sales Script",
  "SOP Library",
  "KPI Tracker",
] as const;

export const RESULT_FIELDS = [
  { key: "revenue_before", label: "Revenue before" },
  { key: "revenue_now", label: "Revenue now" },
  { key: "leads_month", label: "Leads / month" },
  { key: "calls_booked", label: "Calls booked" },
  { key: "close_rate", label: "Close rate" },
  { key: "team_size", label: "Team size" },
] as const;

export const UPSELL_PRICES = { amalor: 297, sss: 47 } as const;

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function taskKey(phase: number, index: number) {
  return `${phase}_${index}`;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function toClient(row: ClientRow): Client {
  return {
    ...row,
    tasks: (row.tasks && typeof row.tasks === "object" && !Array.isArray(row.tasks)
      ? row.tasks
      : {}) as Record<string, boolean>,
    custom_tasks: asArray<CustomTask>(row.custom_tasks),
    docs: asArray<ClientDoc>(row.docs),
    web_links: asArray<WebLink>(row.web_links),
    call_reviews: asArray<CallReview>(row.call_reviews),
    results: (row.results && typeof row.results === "object" && !Array.isArray(row.results)
      ? row.results
      : {}) as Results,
  };
}

export function toPhase(row: PhaseTaskRow): PhaseRow {
  return { ...row, tasks: asArray<PhaseTask>(row.tasks) };
}

export function phaseProgress(client: Client, phase: PhaseRow) {
  const total = phase.tasks.length;
  let done = 0;
  for (let i = 0; i < total; i += 1) {
    if (client.tasks[taskKey(phase.phase_id, i)]) done += 1;
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function overallProgress(client: Client, phases: PhaseRow[]) {
  let done = 0;
  let total = 0;
  for (const phase of phases) {
    const p = phaseProgress(client, phase);
    done += p.done;
    total += p.total;
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function phasesComplete(client: Client, phases: PhaseRow[]) {
  return phases.filter((phase) => {
    const p = phaseProgress(client, phase);
    return p.total > 0 && p.done === p.total;
  }).length;
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** Parses free text like "9th June" or "14th April 27" into a real Date. */
export function parseLeavingDate(text: string | null | undefined, now = new Date()): Date | null {
  if (!text) return null;
  const clean = text.toLowerCase().replace(/(\d+)(st|nd|rd|th)/g, "$1");
  const dayMatch = clean.match(/\b(\d{1,2})\b/);
  const month = MONTHS.findIndex((m) => clean.includes(m.slice(0, 3)));
  if (month < 0 || !dayMatch) return null;
  const day = Number(dayMatch[1]);

  const yearMatch = clean.match(/\b(\d{2,4})\s*$/);
  let year = now.getFullYear();
  if (yearMatch && Number(yearMatch[1]) !== day) {
    const raw = Number(yearMatch[1]);
    year = raw < 100 ? 2000 + raw : raw;
  } else {
    const candidate = new Date(year, month, day);
    if (candidate.getTime() < now.getTime() - 86400000) year += 1;
  }
  const date = new Date(year, month, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysUntilLeaving(client: Pick<Client, "leaving">, now = new Date()): number | null {
  const date = parseLeavingDate(client.leaving, now);
  if (!date) return null;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((date.getTime() - start.getTime()) / 86400000);
}

/**
 * Maps whatever the sheet or old data says onto the five allowed tiers.
 * "DIY" was the old name for "DBY", and tier order is always DFY, DWY, DBY.
 */
export function normaliseProgram(program: string | null | undefined): string | null {
  if (!program) return null;
  const parts: string[] = program
    .toUpperCase()
    .split(/[/,&+]/)
    .map((part) => part.trim().replace(/\s+/g, ""))
    .map((part) => (part === "DIY" ? "DBY" : part));
  const unique = ["DFY", "DWY", "DBY"].filter((tier) => parts.includes(tier));
  if (unique.length === 0) return null;
  const joined = unique.join("/");
  if ((PROGRAMS as readonly string[]).includes(joined)) return joined;
  // Anything wider than the allowed pairs (e.g. all three) keeps its first two tiers.
  return unique.slice(0, 2).join("/");
}

export function programColour(program: string | null | undefined) {
  switch (program) {
    case "DFY":
      return "var(--phase-1)";
    case "DWY":
      return "var(--phase-5)";
    case "DBY":
      return "var(--phase-3)";
    default:
      return "var(--phase-6)";
  }
}

/** Combination tiers get a mixed gradient of the tiers they contain. */
export function programStyle(program: string | null | undefined) {
  if (!isCombinationProgram(program)) {
    return { backgroundColor: programColour(program) };
  }
  const stops = (program ?? "").split("/").map((part) => programColour(part.trim().toUpperCase()));
  return { backgroundImage: `linear-gradient(100deg, ${stops.join(", ")})` };
}

export function docTypeColour(type: string) {
  switch (type) {
    case "Doc":
      return "var(--phase-5)";
    case "Sheet":
      return "var(--phase-4)";
    case "Slides":
      return "var(--phase-2)";
    case "PDF":
      return "var(--phase-1)";
    case "Video":
      return "var(--phase-6)";
    default:
      return "var(--light-text)";
  }
}

export function currency(value: number) {
  return `£${value.toLocaleString("en-GB")}`;
}

/** Pulls the first numeric amount out of a value string like "£4,500/mo". */
export function parseValue(value: string | null | undefined) {
  if (!value) return 0;
  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export function phaseColour(phase: number): string {
  return PHASE_COLOURS[phase] ?? "var(--primary)";
}
