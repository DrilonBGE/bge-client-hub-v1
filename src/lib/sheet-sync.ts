import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { buildStandardTasks } from "@/lib/task-templates";
import { logAudit } from "@/lib/queries";
import { isSuspectLeaving } from "@/lib/sheet-sync.functions";

export type PendingRow = {
  id: string;
  name: string;
  kind: string;
  client_id: string | null;
  fields: Record<string, string | number | null>;
  changes: Record<string, { old: string | null; new: string | null }>;
  sheet_row: number | null;
  status: string;
  parked_until: string | null;
  created_at: string;
};

/** How long "Unclear right now" parks a row before it asks again. */
const PARK_DAYS = 3;

const dayString = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

/** Days a row or flag has been sat waiting for someone to decide. */
export function waitingDays(since: string | null | undefined) {
  if (!since) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / (1000 * 60 * 60 * 24)));
}

/** The fields the Active Client Sheet owns. Portal notes stay separate. */
const SHEET_FIELDS = [
  "renewal",
  "active",
  "leaving",
  "program",
  "payment",
  "sheet_notes",
  "vsl_form",
  "vsl_delivered",
  "ads_delivered",
  "sheet_row",
] as const;

function sheetPatch(fields: Record<string, string | number | null>) {
  const patch: Record<string, string | number | null | boolean> = {};
  for (const field of SHEET_FIELDS) patch[field] = fields[field] ?? null;
  patch["leaving_date_suspect"] = isSuspectLeaving(fields["leaving"] as string | null);
  patch["missing_from_sheet"] = false;
  patch["origin"] = "sheet";
  patch["last_sheet_sync"] = new Date().toISOString();
  return patch;
}

const isYes = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase() === "yes";

/**
 * The sheet is authoritative for these three deliverables, so they drive the
 * matching Phase 1 task instead of a second tracking system. When the portal
 * and the sheet disagree the other way round, we surface it rather than
 * overwrite either side.
 */
async function applyDeliveryFlags(
  clientId: string,
  clientName: string,
  fields: Record<string, string | number | null>,
) {
  const map: [string, RegExp][] = [
    ["vsl_form", /vsl.*(form|intake)/i],
    ["vsl_delivered", /vsl copy|write vsl/i],
    ["ads_delivered", /ads copy|write ads/i],
  ];

  const { data: tasks } = await supabase
    .from("client_tasks")
    .select("id, title, status")
    .eq("client_id", clientId)
    .eq("phase_id", 1);

  for (const [field, pattern] of map) {
    const value = fields[field];
    if (value == null || String(value).trim() === "") continue;
    const task = (tasks ?? []).find((t) => pattern.test(t.title));
    if (!task) continue;

    if (isYes(value)) {
      if (task.status !== "done") {
        await supabase
          .from("client_tasks")
          .update({ status: "done", actual_date: new Date().toISOString().slice(0, 10) })
          .eq("id", task.id);
      }
      continue;
    }

    if (task.status === "done") {
      await supabase.from("notifications").insert({
        client_id: clientId,
        audience: "team",
        kind: "warning",
        title: `Sheet conflict on ${clientName}`,
        body: `"${task.title}" is marked done in the portal but the sheet says "${String(value)}". Nothing was changed — check which is right.`,
      });
    }
  }
}

export function usePendingSheetRows() {
  return useQuery({
    queryKey: ["sheet_pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sheet_pending")
        .select("*")
        .in("status", ["pending", "parked"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      const today = dayString();
      // A parked row comes back once its waiting date has passed.
      return (data ?? [])
        .map((row) => row as unknown as PendingRow)
        .map((row) =>
          row.status === "parked" && (row.parked_until ?? today) <= today
            ? { ...row, status: "pending" }
            : row,
        );
    },
  });
}

/** "Unclear right now" — park the row and ask again in a few days. */
export function useParkSheetRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ row }: { row: PendingRow }) => {
      const { error } = await supabase
        .from("sheet_pending")
        .update({ status: "parked", parked_until: dayString(PARK_DAYS) })
        .eq("id", row.id);
      if (error) throw error;
      await logAudit(
        "sheet_row_parked",
        row.name,
        `Unclear right now — asking again in ${PARK_DAYS} days`,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sheet_pending"] }),
  });
}

/**
 * "Fix the Active Client Sheet" — the client is still with us and the sheet is
 * wrong, so stop flagging them until their name is back on it.
 */
export function useKeepDespiteSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      client,
      note,
    }: {
      client: { id: string; name: string };
      note?: string;
    }) => {
      const { error } = await supabase
        .from("clients")
        .update({
          missing_from_sheet: false,
          sheet_ok_override: true,
          sheet_override_note: note?.trim() || "Still a client — the sheet needs fixing.",
        })
        .eq("id", client.id);
      if (error) throw error;
      await supabase.from("notifications").insert({
        client_id: client.id,
        audience: "team",
        kind: "warning",
        title: `Fix the Active Client Sheet for ${client.name}`,
        body: "They are still a client but their row is missing from the sheet. Add them back on the sheet.",
      });
      await logAudit(
        "sheet_needs_fixing",
        client.name,
        "Still a client — the sheet row is missing",
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["clients"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/**
 * A name on the sheet who has not finished onboarding: put them on the
 * onboarding board and set a reminder to chase their documents.
 */
export function useChaseOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ row }: { row: PendingRow }) => {
      const program = (row.fields["program"] as string | null) ?? null;
      const { data: created, error } = await supabase
        .from("onboarding_cases")
        .insert({
          name: row.name,
          program,
          deal_value: (row.fields["active"] as string | null) ?? null,
          stage: "paid",
          source: "sheet",
          sheet_row: row.sheet_row,
          notes: "On the Active Client Sheet but the onboarding documents are not done yet.",
        } as never)
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("onboarding_events").insert({
        case_id: created.id,
        stage: "paid",
        detail: "Picked up from the Active Client Sheet — chasing their onboarding documents.",
        actor: "Active Client Sheet",
      } as never);
      await supabase.from("global_todos").insert({
        text: `Chase ${row.name} to finish their onboarding documents`,
        detail: "They are on the Active Client Sheet but have not completed onboarding.",
        priority: "high",
        source: "team",
        due_date: dayString(2),
      } as never);
      await supabase.from("notifications").insert({
        audience: "team",
        kind: "warning",
        title: `${row.name} is on the sheet but not onboarded`,
        body: "Reach out and get their onboarding documents completed.",
      });
      await supabase
        .from("sheet_pending")
        .update({ status: "approved", decided_at: new Date().toISOString() })
        .eq("id", row.id);
      await logAudit("sheet_row_chase_onboarding", row.name, "Added to the onboarding board");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sheet_pending"] });
      void qc.invalidateQueries({ queryKey: ["onboarding_cases"] });
      void qc.invalidateQueries({ queryKey: ["global_todos"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDecideSheetRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      row,
      approve,
      linkClientId,
    }: {
      row: PendingRow;
      approve: boolean;
      /** Chosen profile to merge the sheet row into; overrides the suggested match. */
      linkClientId?: string | null;
    }) => {
      if (approve) {
        const patch = sheetPatch(row.fields);
        const targetId = linkClientId ?? (row.kind === "link" ? row.client_id : null);

        if (!targetId) {
          const { data: created, error } = await supabase
            .from("clients")
            .insert({ name: row.name, phase: 1, ...patch } as never)
            .select("id, program, journey_start, joined_date")
            .single();
          if (error) throw error;
          const tasks = buildStandardTasks(created);
          await supabase.from("client_tasks").insert(tasks as never);
          await applyDeliveryFlags(created.id, row.name, row.fields);
          // Someone already part-way through onboarding: tie them together.
          const caseId = row.fields["onboarding_case_id"] as string | null;
          if (caseId) {
            await supabase
              .from("onboarding_cases")
              .update({ client_id: created.id } as never)
              .eq("id", caseId);
            await supabase.from("onboarding_events").insert({
              case_id: caseId,
              stage: "paid",
              detail: `Linked to their profile from the Active Client Sheet (row ${row.sheet_row ?? "?"}).`,
              actor: "Active Client Sheet",
            } as never);
          }
        } else {
          const { error } = await supabase
            .from("clients")
            .update({ ...patch, ex_client: false, sheet_row: row.sheet_row } as never)
            .eq("id", targetId);
          if (error) throw error;
          await applyDeliveryFlags(targetId, row.name, row.fields);
        }
      }

      const { error: updateError } = await supabase
        .from("sheet_pending")
        .update({
          status: approve ? "approved" : "dismissed",
          decided_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (updateError) throw updateError;

      await logAudit(
        approve ? "sheet_row_approved" : "sheet_row_dismissed",
        row.name,
        `${row.kind} from the Active Client Sheet`,
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sheet_pending"] });
      void qc.invalidateQueries({ queryKey: ["clients"] });
      void qc.invalidateQueries({ queryKey: ["client_tasks"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/** Keep or retire a client the sheet no longer lists. */
export function useResolveMissingClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      client,
      keep,
    }: {
      client: { id: string; name: string };
      keep: boolean;
    }) => {
      const { error } = await supabase
        .from("clients")
        .update(
          keep
            ? { missing_from_sheet: false }
            : {
                missing_from_sheet: false,
                ex_client: true,
                ex_client_date: new Date().toISOString().slice(0, 10),
              },
        )
        .eq("id", client.id);
      if (error) throw error;
      await logAudit(
        keep ? "sheet_missing_kept" : "sheet_missing_ex_client",
        client.name,
        keep ? "Kept as an active client" : "Moved to ex-clients",
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

/** "Unclear right now" for a client the sheet no longer lists. */
export function useParkMissingClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ client }: { client: { id: string; name: string } }) => {
      const { error } = await supabase
        .from("clients")
        .update({ sheet_override_note: `Unclear right now — asked ${dayString()}` } as never)
        .eq("id", client.id);
      if (error) throw error;
      await logAudit("sheet_missing_unclear", client.name, "Parked until someone knows");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}
