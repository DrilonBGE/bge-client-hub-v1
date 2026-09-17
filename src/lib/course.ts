import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { PORTAL_TAB_KEYS, type PortalTabKey } from "@/lib/portal-tabs";

export type CourseSection = Database["public"]["Tables"]["course_sections"]["Row"];
export type CourseModule = Database["public"]["Tables"]["course_modules"]["Row"];
export type CourseItem = Database["public"]["Tables"]["course_items"]["Row"];
export type CourseItemUpdate = Database["public"]["Tables"]["course_items"]["Update"];
export type ClientAccess = Database["public"]["Tables"]["client_access"]["Row"];

/** How many videos a client must finish before the call with William. */
export const VIDEOS_BEFORE_WILLIAM_CALL = 31;

export type CourseTree = (CourseSection & {
  modules: (CourseModule & { items: CourseItem[] })[];
})[];

/** The whole course library, sections → modules → items, in order. */
export function useCourse() {
  return useQuery({
    queryKey: ["course"],
    queryFn: async (): Promise<CourseTree> => {
      const [sections, modules, items] = await Promise.all([
        supabase.from("course_sections").select("*").order("sort_order"),
        supabase.from("course_modules").select("*").order("sort_order"),
        supabase.from("course_items").select("*").order("global_order"),
      ]);
      if (sections.error) throw sections.error;
      if (modules.error) throw modules.error;
      if (items.error) throw items.error;

      return (sections.data ?? []).map((section) => ({
        ...section,
        modules: (modules.data ?? [])
          .filter((module) => module.section_id === section.id)
          .map((module) => ({
            ...module,
            items: (items.data ?? [])
              .filter((item) => item.module_id === module.id)
              .sort((a, b) => a.sort_order - b.sort_order),
          })),
      }));
    },
  });
}

/** Items this client has ticked off. */
export function useCourseProgress(clientId: string | undefined) {
  return useQuery({
    queryKey: ["course_progress", clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_progress")
        .select("*")
        .eq("client_id", clientId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCourseProgressMutations(clientId: string | undefined) {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ["course_progress", clientId] });

  const toggle = useMutation({
    mutationFn: async ({ itemId, done: mark }: { itemId: string; done: boolean }) => {
      if (!clientId) return;
      if (mark) {
        const { error } = await supabase
          .from("course_progress")
          .upsert({ client_id: clientId, item_id: itemId } as never, {
            onConflict: "client_id,item_id",
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("course_progress")
          .delete()
          .eq("client_id", clientId)
          .eq("item_id", itemId);
        if (error) throw error;
      }
    },
    onSuccess: done,
  });

  return { toggle };
}

/** Team editing of the library itself. */
export function useCourseMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ["course"] });

  const updateItem = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: CourseItemUpdate }) => {
      const { error } = await supabase
        .from("course_items")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
  });

  return { updateItem };
}

/** Access rows for every client — used by the command centre. */
export function useAllClientAccess() {
  return useQuery({
    queryKey: ["client_access"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_access").select("*");
      if (error) throw error;
      return (data ?? []) as ClientAccess[];
    },
  });
}

/** One client's access row (clients can read their own). */
export function useClientAccess(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client_access", clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_access")
        .select("*")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ClientAccess | null;
    },
  });
}

export function useAccessMutations() {
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async ({
      clientId,
      tabs,
      course,
    }: {
      clientId: string;
      tabs?: Record<string, boolean>;
      course?: Record<string, boolean>;
    }) => {
      const patch: Record<string, unknown> = { client_id: clientId };
      if (tabs) patch["tabs"] = tabs;
      if (course) patch["course"] = course;
      const { error } = await supabase
        .from("client_access")
        .upsert(patch as never, { onConflict: "client_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_access"] }),
  });

  return { save };
}

type Toggles = Record<string, boolean> | null | undefined;

/** Everything is on unless it has been switched off. */
export function allowed(map: Toggles, key: string) {
  if (!map) return true;
  return map[key] !== false;
}

export function toggleMap(value: unknown): Record<string, boolean> {
  return value && typeof value === "object" ? (value as Record<string, boolean>) : {};
}

/** Which portal sections this client may see. */
export function visibleTabs(access: ClientAccess | null | undefined): PortalTabKey[] {
  const map = toggleMap(access?.tabs);
  return PORTAL_TAB_KEYS.filter((key) => key === "dashboard" || allowed(map, key));
}
