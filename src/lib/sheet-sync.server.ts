import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import type { SheetSyncResult } from "@/lib/sheet-sync.functions";
import { normaliseProgram } from "@/lib/bge";

/**
 * Reads the Active Client Sheet through the token-protected Apps Script web app
 * and files every difference for human approval. Strictly read only — nothing
 * is ever written back to the sheet, and nothing on the board changes by itself.
 */
const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbwCepjn-FiNjKsYYzNBRwN5rmRVWczUCvxZgjIDlgAO9MXu0XyHHOdfphTHi6TwDCzv/exec";

/** Sheet column → board field. These fields are owned by the sheet. */
const FIELDS: Record<string, string> = {
  Renewal: "renewal",
  "Active Now": "active",
  Leaving: "leaving",
  Program: "program",
  "Payment Method": "payment",
  Notes: "sheet_notes",
  "VSL Form": "vsl_form",
  "VSL Delivered": "vsl_delivered",
  "Ads Delivered": "ads_delivered",
};

type SheetClient = Record<string, string | number | null | undefined>;

function text(value: unknown): string | null {
  const out = typeof value === "string" ? value.trim() : value == null ? "" : String(value);
  return out === "" ? null : out;
}

function mapRow(row: SheetClient) {
  const patch: Record<string, string | number | null> = {};
  for (const [column, field] of Object.entries(FIELDS)) patch[field] = text(row[column]);
  // The sheet still writes the old "DIY" label and mixed tier order.
  patch["program"] = normaliseProgram(patch["program"] as string | null);
  const rowNumber = Number(row["_row"]);
  patch["sheet_row"] = Number.isFinite(rowNumber) ? rowNumber : null;
  return patch;
}

const key = (name: string) => name.toLowerCase().replace(/\s+/g, " ").trim();

export async function runSheetSync(supabase: SupabaseClient<Database>): Promise<SheetSyncResult> {
  const token = process.env["SHEET_SYNC_TOKEN"];
  if (!token) return { ok: false, error: "The sheet token is not configured on the server." };

  let payload: { ok?: boolean; error?: string; clients?: SheetClient[] };
  try {
    const response = await fetch(`${ENDPOINT}?token=${encodeURIComponent(token)}`, {
      headers: { accept: "application/json" },
    });
    const body = await response.text();
    try {
      payload = JSON.parse(body) as typeof payload;
    } catch {
      return { ok: false, error: `The sheet did not return data (status ${response.status}).` };
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The sheet is unreachable.",
    };
  }

  if (payload.ok !== true) {
    return {
      ok: false,
      error:
        payload.error === "unauthorized"
          ? "The sheet rejected our access token."
          : (payload.error ?? "The sheet reported a problem."),
    };
  }

  const rows = (payload.clients ?? []).filter((row) => text(row["Name of client"]));

  const { data: clientRows, error: clientsError } = await supabase
    .from("clients")
    .select(
      "id, name, origin, ex_client, missing_from_sheet, sheet_ok_override, renewal, active, leaving, program, payment, sheet_notes, vsl_form, vsl_delivered, ads_delivered",
    )
    .is("deleted_at", null);
  if (clientsError) return { ok: false, error: clientsError.message };

  const byName = new Map((clientRows ?? []).map((c) => [key(c.name), c]));

  // Onboarding cases with no profile yet: a sheet name matching one of these is
  // someone we already know, so it is offered as a link rather than a new name.
  const { data: caseRows } = await supabase
    .from("onboarding_cases")
    .select("id, name, client_id, stage");
  const caseByName = new Map(
    (caseRows ?? []).filter((row) => !row.client_id).map((row) => [key(row.name), row]),
  );

  const { data: pendingRows } = await supabase
    .from("sheet_pending")
    .select("id, name, kind, client_id, status, parked_until")
    .in("status", ["pending", "parked"]);
  const today = new Date().toISOString().slice(0, 10);
  const live = (pendingRows ?? []).filter(
    (row) => row.status === "pending" || (row.parked_until ?? "9999-12-31") > today,
  );
  const pendingKeys = new Set(live.map((r) => `${r.kind}:${key(r.name)}`));

  let newRows = 0;
  let updates = 0;
  let links = 0;
  const seen = new Set<string>();
  const now = new Date().toISOString();

  for (const row of rows) {
    const name = text(row["Name of client"]) as string;
    const patch = mapRow(row);
    seen.add(key(name));
    const existing = byName.get(key(name));

    // Brand new name on the sheet — wait for approval, never auto-create.
    if (!existing) {
      if (pendingKeys.has(`new:${key(name)}`)) continue;
      const halfOnboarded = caseByName.get(key(name));
      const { error } = await supabase.from("sheet_pending").insert({
        name,
        kind: "new",
        fields: halfOnboarded
          ? {
              ...patch,
              onboarding_case_id: halfOnboarded.id,
              onboarding_stage: halfOnboarded.stage,
            }
          : patch,
        changes: {},
        sheet_row: patch["sheet_row"] as number | null,
      });
      if (!error) {
        newRows += 1;
        pendingKeys.add(`new:${key(name)}`);
      }
      continue;
    }

    // A manually added client now appears on the sheet: offer to link, not duplicate.
    if (existing.origin !== "sheet") {
      if (pendingKeys.has(`link:${key(name)}`)) continue;
      const { error } = await supabase.from("sheet_pending").insert({
        name,
        kind: "link",
        client_id: existing.id,
        fields: patch,
        changes: {},
        sheet_row: patch["sheet_row"] as number | null,
      });
      if (!error) {
        links += 1;
        pendingKeys.add(`link:${key(name)}`);
      }
      continue;
    }

    // A client back on the sheet is no longer missing, and any "the sheet is
    // wrong" note we left has served its purpose.
    if (existing.missing_from_sheet || existing.sheet_ok_override) {
      await supabase
        .from("clients")
        .update({ missing_from_sheet: false, sheet_ok_override: false, sheet_override_note: null })
        .eq("id", existing.id);
    }

    const changes: Record<string, { old: string | null; new: string | null }> = {};
    for (const field of Object.values(FIELDS)) {
      const before = (existing as Record<string, unknown>)[field] as string | null | undefined;
      const after = patch[field] as string | null;
      if ((before ?? null) !== (after ?? null)) {
        changes[field] = { old: before ?? null, new: after ?? null };
      }
    }

    if (Object.keys(changes).length === 0) {
      await supabase.from("clients").update({ last_sheet_sync: now }).eq("id", existing.id);
      continue;
    }

    // Refresh any waiting update for this client rather than stacking duplicates.
    await supabase
      .from("sheet_pending")
      .delete()
      .eq("status", "pending")
      .eq("kind", "update")
      .eq("client_id", existing.id);

    const { error } = await supabase.from("sheet_pending").insert({
      name,
      kind: "update",
      client_id: existing.id,
      fields: patch,
      changes,
      sheet_row: patch["sheet_row"] as number | null,
    });
    if (!error) updates += 1;
  }

  // Rows that vanished from the sheet: flag every active client for review.
  let missing = 0;
  for (const client of clientRows ?? []) {
    if (client.ex_client) continue;
    if (seen.has(key(client.name))) continue;
    if (pendingKeys.has(`link:${key(client.name)}`)) continue;
    // Someone already told us the sheet is wrong about this client.
    if (client.sheet_ok_override) continue;
    if (client.missing_from_sheet) {
      missing += 1;
      continue;
    }
    await supabase.from("clients").update({ missing_from_sheet: true }).eq("id", client.id);
    await supabase.from("notifications").insert({
      client_id: client.id,
      audience: "team",
      kind: "warning",
      title: `${client.name} is no longer on the Active Client Sheet`,
      body: "Keep as active client, or move to ex-client?",
    });
    missing += 1;
  }

  if (newRows) {
    await supabase.from("notifications").insert({
      audience: "team",
      kind: "info",
      title: `${newRows} new client${newRows === 1 ? "" : "s"} from the Active Client Sheet`,
      body: "Waiting for a decision on the Onboarding page.",
    });
  }

  return { ok: true, fetched: rows.length, newRows, updates, links, missing };
}
