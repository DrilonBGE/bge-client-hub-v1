import { supabase } from "@/integrations/supabase/client";
import type { Client } from "@/lib/bge";

function cell(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : JSON.stringify(value);
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, " / ")}"`;
}

export function toCsv(headers: string[], rows: unknown[][]) {
  return [headers.map(cell).join(","), ...rows.map((row) => row.map(cell).join(","))].join("\r\n");
}

/** Saves a spreadsheet to the person's downloads, ready to open in Excel. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const BASE_COLUMNS = [
  ["Client", (c: Client) => c.name],
  ["Program / tier", (c: Client) => c.tier || c.program],
  ["Value", (c: Client) => c.active],
  ["Niche", (c: Client) => c.niche],
  ["Phase reached", (c: Client) => c.phase],
  ["Joined", (c: Client) => c.joined_date],
  ["Journey start", (c: Client) => c.journey_start],
  ["Left on", (c: Client) => c.ex_client_date],
  ["Cancel reason", (c: Client) => c.cancel_reason],
  ["Recorded by", (c: Client) => c.cancel_recorded_by],
  ["Health", (c: Client) => c.health],
  ["Difficulty", (c: Client) => c.difficulty],
  ["Email", (c: Client) => c.email],
  ["Phone", (c: Client) => c.phone],
  ["Socials", (c: Client) => c.socials],
  ["Payment", (c: Client) => c.payment],
  ["Amalor", (c: Client) => c.amalor],
  ["Amalor notes", (c: Client) => c.amalor_note],
  ["SpeakScript Scale", (c: Client) => c.sss],
  ["SpeakScript notes", (c: Client) => c.sss_note],
  ["Commas", (c: Client) => c.commas],
  ["Commas notes", (c: Client) => c.commas_note],
  ["Renewal owner", (c: Client) => c.renewal_owner || c.renewal_team_member],
  ["Renewal talked", (c: Client) => c.renewal_talked],
  ["Renewal notes", (c: Client) => c.renewal_notes || c.renewal_ideas],
  ["New contract discussed", (c: Client) => c.renewal_new_contract],
  ["Value leaving", (c: Client) => c.renewal_value_leaving],
  ["Other renewal notes", (c: Client) => c.renewal_other_notes],
  ["Why they signed up", (c: Client) => c.why_signed_up],
  ["Business context", (c: Client) => c.business_context],
  ["Internal notes", (c: Client) => c.notes],
  ["Funnel", (c: Client) => c.funnel_url],
  ["Drive folder", (c: Client) => c.drive_folder_url],
  ["Case study", (c: Client) => (c.case_study ? "Yes" : "No")],
  ["Mastermind", (c: Client) => c.mastermind],
] as const;

type TaskRow = {
  client_id: string;
  title: string;
  owner: string | null;
  status: string;
  phase_id: number;
  expected_date: string | null;
  actual_date: string | null;
  submission_url: string | null;
};

/**
 * Everything on an ex-client: the archive details plus what lived inside
 * their own dashboard — documents, links, calls, results and journey tasks.
 */
export async function buildExClientExport(clients: Client[]) {
  const ids = clients.map((c) => c.id);
  let tasks: TaskRow[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("client_tasks")
      .select("client_id,title,owner,status,phase_id,expected_date,actual_date,submission_url")
      .in("client_id", ids);
    tasks = (data ?? []) as TaskRow[];
  }

  const headers = [
    ...BASE_COLUMNS.map(([label]) => label),
    "Documents",
    "Links",
    "Calls",
    "Results",
    "Journey tasks",
    "Deliverable links",
  ];

  const rows = clients.map((client) => {
    const mine = tasks.filter((t) => t.client_id === client.id);
    return [
      ...BASE_COLUMNS.map(([, read]) => read(client)),
      client.docs.map((d) => `${d.name}: ${d.url}`).join(" | "),
      client.web_links.map((l) => `${l.label}: ${l.url}`).join(" | "),
      client.call_reviews
        .map((c) => `${c.date} ${c.type} (${c.who}) ${c.notes ?? ""} ${c.fathom ?? ""}`.trim())
        .join(" | "),
      Object.entries(client.results)
        .filter(([, value]) => typeof value === "string" && value)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(" | "),
      mine
        .map((t) => `P${t.phase_id} ${t.title} — ${t.status} (${t.owner ?? "unassigned"})`)
        .join(" | "),
      mine
        .filter((t) => t.submission_url)
        .map((t) => `${t.title}: ${t.submission_url}`)
        .join(" | "),
    ];
  });

  return toCsv(headers, rows);
}
