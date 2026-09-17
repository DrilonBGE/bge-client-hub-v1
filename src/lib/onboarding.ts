import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { normaliseProgram } from "@/lib/bge";
import { logAudit } from "@/lib/queries";
import { buildStandardTasks } from "@/lib/task-templates";

export type OnboardingStage =
  "paid" | "agreement_sent" | "agreement_signed" | "portal_invited" | "portal_active" | "roadmap";

export type OnboardingCase = {
  id: string;
  client_id: string | null;
  name: string;
  email: string | null;
  program: string | null;
  deal_value: string | null;
  closer: string | null;
  whatsapp: boolean;
  stage: string;
  agreement_kind: string;
  agreement_note: string | null;
  notes: string | null;
  source: string;
  paid_at: string;
  agreement_sent_at: string | null;
  agreement_signed_at: string | null;
  portal_invited_at: string | null;
  portal_active_at: string | null;
  roadmap_at: string | null;
  created_at: string;
  updated_at: string;
};

/** The stages a paid client moves through before they land on the roadmap. */
export const STAGES: { key: OnboardingStage; label: string; hint: string; stamp: string }[] = [
  {
    key: "paid",
    label: "Paid",
    hint: "Paid on or after the call. Tagged DFY / DWY / DBY - Paid in Amalor.",
    stamp: "paid_at",
  },
  {
    key: "agreement_sent",
    label: "Agreement sent",
    hint: "Agreement email went out from Amalor.",
    stamp: "agreement_sent_at",
  },
  {
    key: "agreement_signed",
    label: "Agreement signed",
    hint: "Signed copy is back. Ready for their portal.",
    stamp: "agreement_signed_at",
  },
  {
    key: "portal_invited",
    label: "Portal invited",
    hint: "Profile and login created — the portal email now works.",
    stamp: "portal_invited_at",
  },
  {
    key: "portal_active",
    label: "Portal active",
    hint: "They have logged in and started.",
    stamp: "portal_active_at",
  },
  {
    key: "roadmap",
    label: "On roadmap",
    hint: "Fully onboarded. Everything now lives on their journey.",
    stamp: "roadmap_at",
  },
];

export const STAGE_LABELS: Record<string, string> = Object.fromEntries(
  STAGES.map((stage) => [stage.key, stage.label]),
);

export function stageIndex(stage: string) {
  const found = STAGES.findIndex((item) => item.key === stage);
  return found < 0 ? 0 : found;
}

/** When the case last moved, so we can flag anyone sat still too long. */
export function stageSince(row: OnboardingCase) {
  const stamp = STAGES[stageIndex(row.stage)]?.stamp as keyof OnboardingCase | undefined;
  const value = (stamp ? row[stamp] : null) ?? row.updated_at ?? row.created_at;
  return typeof value === "string" ? value : row.created_at;
}

export function daysWaiting(row: OnboardingCase) {
  const since = new Date(stageSince(row)).getTime();
  return Math.floor((Date.now() - since) / 86400000);
}

export function useOnboardingCases() {
  return useQuery({
    queryKey: ["onboarding_cases"],
    queryFn: async (): Promise<OnboardingCase[]> => {
      const { data, error } = await supabase
        .from("onboarding_cases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OnboardingCase[];
    },
  });
}

export function useOnboardingEvents(caseId?: string) {
  return useQuery({
    queryKey: ["onboarding_events", caseId ?? "all"],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_events")
        .select("*")
        .eq("case_id", caseId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["onboarding_cases"] });
    void qc.invalidateQueries({ queryKey: ["onboarding_events"] });
    void qc.invalidateQueries({ queryKey: ["clients"] });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };
}

export function useAddOnboardingCase() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      email?: string;
      program: string;
      deal_value?: string;
      closer?: string;
      whatsapp?: boolean;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("onboarding_cases")
        .insert({
          name: input.name.trim(),
          email: input.email?.trim() || null,
          program: normaliseProgram(input.program),
          deal_value: input.deal_value?.trim() || null,
          closer: input.closer || null,
          whatsapp: input.whatsapp ?? false,
          notes: input.notes?.trim() || null,
          stage: "paid",
          source: "manual",
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("onboarding_events").insert({
        case_id: (data as { id: string }).id,
        stage: "paid",
        detail: "Added to onboarding",
      } as never);
      await supabase.from("notifications").insert({
        audience: "team",
        kind: "info",
        title: `${input.name} has paid — onboarding started`,
        body: "Send the agreement, then invite them into the portal.",
      });
      await logAudit("onboarding_started", input.name, `${input.program} — paid`);
    },
    onSuccess: invalidate,
  });
}

export function useUpdateOnboardingCase() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<OnboardingCase> }) => {
      const { error } = await supabase
        .from("onboarding_cases")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useAdvanceOnboardingCase() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ row, stage }: { row: OnboardingCase; stage: OnboardingStage }) => {
      const stamp = STAGES.find((item) => item.key === stage)?.stamp;
      const patch: Record<string, unknown> = { stage };
      if (stamp && !row[stamp as keyof OnboardingCase]) patch[stamp] = new Date().toISOString();

      const { error } = await supabase
        .from("onboarding_cases")
        .update(patch as never)
        .eq("id", row.id);
      if (error) throw error;

      await supabase.from("onboarding_events").insert({
        case_id: row.id,
        stage,
        detail: `Moved to ${STAGE_LABELS[stage] ?? stage}`,
      } as never);

      if (stage === "roadmap" && row.client_id) {
        await supabase
          .from("clients")
          .update({ journey_start: new Date().toISOString().slice(0, 10) })
          .eq("id", row.client_id);
      }

      await logAudit("onboarding_stage", row.name, STAGE_LABELS[stage] ?? stage);
    },
    onSuccess: invalidate,
  });
}

/**
 * Turns a signed case into a real client profile plus their portal invite, so
 * the login link email from Amalor lands on a working account. The Active
 * Client Sheet later links to this same profile instead of duplicating it.
 */
export function useCreateClientFromCase() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (row: OnboardingCase) => {
      if (row.client_id) return row.client_id;
      const today = new Date().toISOString().slice(0, 10);

      const { data: created, error } = await supabase
        .from("clients")
        .insert({
          name: row.name,
          program: normaliseProgram(row.program),
          active: row.deal_value,
          email: row.email,
          phase: 1,
          origin: "portal",
          journey_start: today,
          joined_date: today,
        } as never)
        .select("id, program, journey_start, joined_date")
        .single();
      if (error) throw error;

      const clientId = (created as { id: string }).id;
      await supabase.from("client_tasks").insert(buildStandardTasks(created as never) as never);

      if (row.email) {
        await supabase.from("client_invites").insert({
          client_id: clientId,
          email: row.email.trim().toLowerCase(),
        } as never);
      }

      await supabase
        .from("onboarding_cases")
        .update({
          client_id: clientId,
          stage: "portal_invited",
          portal_invited_at: new Date().toISOString(),
        } as never)
        .eq("id", row.id);

      await supabase.from("onboarding_events").insert({
        case_id: row.id,
        stage: "portal_invited",
        detail: "Client profile and portal invite created",
      } as never);

      await supabase.from("notifications").insert({
        client_id: clientId,
        audience: "team",
        kind: "info",
        title: `${row.name} is in the portal`,
        body: "Profile, roadmap and portal login are ready. Waiting on their first sign in.",
      });

      await logAudit("onboarding_portal_created", row.name, "Profile and invite created");
      return clientId;
    },
    onSuccess: invalidate,
  });
}

export function useRemoveOnboardingCase() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (row: OnboardingCase) => {
      const { error } = await supabase.from("onboarding_cases").delete().eq("id", row.id);
      if (error) throw error;
      await logAudit("onboarding_removed", row.name, "Removed from onboarding");
    },
    onSuccess: invalidate,
  });
}
