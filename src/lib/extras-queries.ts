import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
type Insert<T extends keyof Tables> = Tables[T]["Insert"];
type Update<T extends keyof Tables> = Tables[T]["Update"];

export type AdsRow = Tables["client_ads"]["Row"];
export type DraftRow = Tables["client_drafts"]["Row"];

/* ---------------- ads performance ---------------- */

export function useAds(clientId: string) {
  return useQuery({
    queryKey: ["client_ads", clientId],
    queryFn: async (): Promise<AdsRow[]> => {
      const { data, error } = await supabase
        .from("client_ads")
        .select("*")
        .eq("client_id", clientId)
        .order("week_start", { ascending: false });
      if (error) throw error;
      return data as AdsRow[];
    },
  });
}

export function useAdsMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["client_ads"] });

  const add = useMutation({
    mutationFn: async (input: Insert<"client_ads">) => {
      const { error } = await supabase.from("client_ads").insert(input as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Update<"client_ads"> }) => {
      const { error } = await supabase
        .from("client_ads")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, update, remove };
}

/* ---------------- saved drafts ---------------- */

export function useDrafts(clientId: string) {
  return useQuery({
    queryKey: ["client_drafts", clientId],
    queryFn: async (): Promise<DraftRow[]> => {
      const { data, error } = await supabase
        .from("client_drafts")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DraftRow[];
    },
  });
}

export function useDraftMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["client_drafts"] });

  const add = useMutation({
    mutationFn: async (input: Insert<"client_drafts">) => {
      const { error } = await supabase.from("client_drafts").insert(input as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Update<"client_drafts"> }) => {
      const { error } = await supabase
        .from("client_drafts")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_drafts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, update, remove };
}
