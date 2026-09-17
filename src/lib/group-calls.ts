import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type GroupCall = Database["public"]["Tables"]["group_calls"]["Row"];
type GroupCallInsert = Database["public"]["Tables"]["group_calls"]["Insert"];
type GroupCallUpdate = Database["public"]["Tables"]["group_calls"]["Update"];

/** The weekly group calls every client with access can see. */
export function useGroupCalls() {
  return useQuery({
    queryKey: ["group_calls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_calls")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GroupCall[];
    },
  });
}

/** Add, change and remove the weekly group calls. Team only. */
export function useGroupCallMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ["group_calls"] });

  const add = useMutation({
    mutationFn: async (row: GroupCallInsert) => {
      const { error } = await supabase.from("group_calls").insert(row as never);
      if (error) throw error;
    },
    onSuccess: done,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: GroupCallUpdate }) => {
      const { error } = await supabase
        .from("group_calls")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("group_calls").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
  });

  return { add, update, remove };
}

/**
 * A one-off change to a call — a different day, time or a note — takes over
 * whenever the team switch it on, so clients always see the real details.
 */
export function effectiveCall(call: GroupCall) {
  const temp = call as GroupCall & {
    temp_active?: boolean | null;
    temp_day?: string | null;
    temp_time?: string | null;
    temp_note?: string | null;
  };
  const on = Boolean(temp.temp_active);
  return {
    day: (on && temp.temp_day) || call.day,
    time: (on && temp.temp_time) || call.time,
    note: (on && temp.temp_note) || call.note,
    temporary: on,
    tempNote: on ? (temp.temp_note ?? null) : null,
  };
}

/**
 * How long until the next time this weekly call runs. Returns null when we do
 * not know the day yet.
 */
export function nextCallCountdown(day: string | null): string | null {
  if (!day) return null;
  const index = CALL_DAYS.indexOf(day);
  if (index < 0) return null;
  const target = (index + 1) % 7; // CALL_DAYS starts on Monday, JS weeks on Sunday
  const now = new Date();
  const days = (target - now.getDay() + 7) % 7;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export const CALL_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
