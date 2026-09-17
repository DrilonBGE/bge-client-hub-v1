import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { auditUserName, logAudit } from "@/lib/queries";
import { normaliseProgram } from "@/lib/bge";
import { buildStandardTasks } from "@/lib/task-templates";
import type { PendingRow } from "@/lib/sheet-sync";

/** A client who has signed up on their own link and is waiting on us. */
export type Signup = {
  id: string;
  name: string;
  email: string | null;
  portal_email: string | null;
  phone: string | null;
  program: string | null;
  first_payment_date: string | null;
  portal_status: string;
  denied_reason: string | null;
  created_at: string;
  verified_at: string | null;
  verified_by: string | null;
};

const SELECT =
  "id, name, email, portal_email, phone, program, first_payment_date, portal_status, denied_reason, created_at, verified_at, verified_by";

const today = () => new Date().toISOString().slice(0, 10);

function useSignupsWhere(status: "pending" | "denied") {
  return useQuery({
    queryKey: ["portal_signups", status],
    queryFn: async (): Promise<Signup[]> => {
      const { data, error } = await supabase
        .from("clients")
        .select(SELECT)
        .eq("portal_status", status)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Signup[];
    },
  });
}

/** Everyone sitting on pre-verification access right now. */
export function usePendingSignups() {
  return useSignupsWhere("pending");
}

/** Sign-ups we turned down — they live in the ex-client hub. */
export function useDeniedSignups() {
  return useSignupsWhere("denied");
}

const clean = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

/**
 * The sheet row most likely to be the same person. People often type a middle
 * name, or only their first name, so first-and-last name matches win, then a
 * shared surname, then a shared first name.
 */
export function suggestSheetRow(name: string, rows: PendingRow[]): PendingRow | null {
  const mine = clean(name);
  if (mine.length === 0) return null;
  const first = mine[0];
  const last = mine[mine.length - 1];

  let best: { row: PendingRow; score: number } | null = null;
  for (const row of rows) {
    const theirs = clean(row.name ?? "");
    if (theirs.length === 0) continue;
    let score = 0;
    if (theirs.join(" ") === mine.join(" ")) score = 100;
    else if (theirs[0] === first && theirs[theirs.length - 1] === last) score = 80;
    else if (mine.length > 1 && theirs.length > 1 && theirs[theirs.length - 1] === last) score = 60;
    else if (theirs[0] === first) score = 40;
    if (score > 0 && (!best || score > best.score)) best = { row, score };
  }
  return best ? best.row : null;
}

/** The bits of a sheet row the team checks before verifying someone. */
export function sheetSummary(row: PendingRow) {
  const field = (key: string) => {
    const value = row.fields?.[key];
    const text = value == null ? "" : String(value).trim();
    return text.length > 0 ? text : null;
  };
  return {
    renewal: field("renewal"),
    active: field("active"),
    leaving: field("leaving"),
    payment: field("payment"),
    program: field("program"),
    notes: field("sheet_notes"),
  };
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["portal_signups"] });
    void qc.invalidateQueries({ queryKey: ["clients"] });
    void qc.invalidateQueries({ queryKey: ["client_tasks"] });
    void qc.invalidateQueries({ queryKey: ["sheet_pending"] });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
    void qc.invalidateQueries({ queryKey: ["my_client"] });
  };
}

/**
 * Verify a fresh sign-up: set the tier we agreed with them, pull across the
 * Active Client Sheet details if that row is theirs, build their roadmap and
 * open the whole portal.
 */
export function useVerifySignup() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      signup,
      program,
      sheetRow,
    }: {
      signup: Signup;
      program: string;
      /** The sheet row this person is, when Jamie has already added them. */
      sheetRow?: PendingRow | null;
    }) => {
      const stamp = today();
      const patch: Record<string, unknown> = {
        portal_status: "verified",
        verified_at: new Date().toISOString(),
        verified_by: auditUserName(),
        program: normaliseProgram(program),
        phase: 1,
        ex_client: false,
        journey_start: signup.first_payment_date ?? stamp,
        joined_date: signup.first_payment_date ?? stamp,
      };

      if (sheetRow) {
        const values = sheetSummary(sheetRow);
        patch["renewal"] = values.renewal;
        patch["active"] = values.active;
        patch["leaving"] = values.leaving;
        patch["payment"] = values.payment;
        patch["sheet_notes"] = values.notes;
        patch["sheet_row"] = sheetRow.sheet_row;
        patch["missing_from_sheet"] = false;
        patch["last_sheet_sync"] = new Date().toISOString();
      }

      const { data: updated, error } = await supabase
        .from("clients")
        .update(patch as never)
        .eq("id", signup.id)
        .select("id, program, journey_start, joined_date, vsl_writer, extension_days")
        .single();
      if (error) throw error;

      const { count } = await supabase
        .from("client_tasks")
        .select("id", { count: "exact", head: true })
        .eq("client_id", signup.id);
      if (!count) {
        const { error: seedError } = await supabase
          .from("client_tasks")
          .insert(buildStandardTasks(updated as never) as never);
        if (seedError) throw seedError;
      }

      const { data: onboarding, error: onboardingError } = await supabase
        .from("client_onboarding")
        .select("completed_at")
        .eq("client_id", signup.id)
        .maybeSingle();
      if (onboardingError) throw onboardingError;
      if (onboarding?.completed_at) {
        const { error: welcomeTaskError } = await supabase
          .from("client_tasks")
          .update({ status: "done", actual_date: today() })
          .eq("client_id", signup.id)
          .eq("step_key", "p1-welcome-docs");
        if (welcomeTaskError) throw welcomeTaskError;
      }

      if (sheetRow) {
        await supabase
          .from("sheet_pending")
          .update({
            status: "approved",
            client_id: signup.id,
            decided_at: new Date().toISOString(),
            decided_by: auditUserName(),
          } as never)
          .eq("id", sheetRow.id);
      }

      await supabase.from("notifications").insert({
        client_id: signup.id,
        audience: "client",
        kind: "info",
        title: "Your account is verified",
        body: "Everything in your portal is now open — your roadmap, calls and links.",
      });

      await logAudit(
        "portal_signup_verified",
        signup.name,
        `Verified as ${normaliseProgram(program)}${sheetRow ? ` and linked to sheet row ${sheetRow.sheet_row ?? "?"}` : " — no sheet row yet"}`,
      );
    },
    onSuccess: invalidate,
  });
}

/** Turn a sign-up down — they move into the denied list in the ex-client hub. */
export function useDenySignup() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ signup, reason }: { signup: Signup; reason?: string }) => {
      const { error } = await supabase
        .from("clients")
        .update({
          portal_status: "denied",
          denied_reason: reason?.trim() || "Denied at portal onboarding",
          ex_client: true,
          ex_client_date: today(),
        } as never)
        .eq("id", signup.id);
      if (error) throw error;
      await logAudit(
        "portal_signup_denied",
        signup.name,
        reason?.trim() || "Denied at portal onboarding",
      );
    },
    onSuccess: invalidate,
  });
}

/** Put a denied sign-up back in the queue if it was the wrong call. */
export function useReopenSignup() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ signup }: { signup: Signup }) => {
      const { error } = await supabase
        .from("clients")
        .update({
          portal_status: "pending",
          denied_reason: null,
          ex_client: false,
          ex_client_date: null,
        } as never)
        .eq("id", signup.id);
      if (error) throw error;
      await logAudit("portal_signup_reopened", signup.name, "Back in the verification queue");
    },
    onSuccess: invalidate,
  });
}
