import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { programKind, type ProgramKind } from "@/lib/journey-steps";
import { getMyOnboardingState, getOnboardingDocuments } from "@/lib/client-profile.functions";

export type OnboardingDoc = {
  id: string;
  program: string;
  title: string;
  description: string | null;
  url: string | null;
  sort_order: number;
  hidden?: boolean | null;
};

export type ClientOnboarding = {
  client_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  agreed: string[];
  completed_at: string | null;
};

export const PROGRAM_KEYS: { key: ProgramKind; label: string }[] = [
  { key: "dfy", label: "Done for you" },
  { key: "dwy", label: "Done with you" },
  { key: "dby", label: "Done by you" },
];

/** Every onboarding document, or just the ones for one programme. */
export function useOnboardingDocs(program?: string | null, previewClientId?: string | null) {
  const kind = program === undefined ? null : programKind(program);
  return useQuery({
    queryKey: ["onboarding_docs"],
    queryFn: async (): Promise<OnboardingDoc[]> => {
      const data = await getOnboardingDocuments({
        data: { program: program ?? null, previewClientId: previewClientId ?? null },
      });
      return (data ?? []) as unknown as OnboardingDoc[];
    },
    // Asking for one programme means a client is looking, so hidden ones drop out.
    select: (rows) =>
      kind ? rows.filter((row) => row.program.toLowerCase() === kind && !row.hidden) : rows,
  });
}

export function useOnboardingDocMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["onboarding_docs"] });

  const add = useMutation({
    mutationFn: async (input: {
      program: ProgramKind;
      title: string;
      sort_order: number;
      description?: string | null;
      url?: string | null;
    }) => {
      const { error } = await supabase.from("onboarding_docs").insert({
        program: input.program.toUpperCase(),
        title: input.title,
        sort_order: input.sort_order,
        description: input.description ?? null,
        url: input.url ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<OnboardingDoc> }) => {
      const { error } = await supabase
        .from("onboarding_docs")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("onboarding_docs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, update, remove };
}

/** Where one client is with step one. */
export function useClientOnboarding(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client_onboarding", clientId ?? "none"],
    enabled: !!clientId,
    queryFn: async (): Promise<ClientOnboarding | null> => {
      const data = await getMyOnboardingState({ data: { clientId: clientId! } });
      if (!data) return null;
      const row = data as unknown as ClientOnboarding & { agreed: unknown };
      return { ...row, agreed: Array.isArray(row.agreed) ? (row.agreed as string[]) : [] };
    },
  });
}
