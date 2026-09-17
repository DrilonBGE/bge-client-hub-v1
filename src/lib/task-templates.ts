import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  STEPS_BY_PHASE,
  buildPhaseSteps,
  programKind,
  type ProgramKind,
} from "@/lib/journey-steps";

type TaskInsert = Database["public"]["Tables"]["client_tasks"]["Insert"];

export { programKind };
export type { ProgramKind };

/**
 * Each phase as exact day offsets from the client's journey start date.
 * Onboarding 0–14, Funnel build 14–28, Pre-launch 28–35, Launch 35–42,
 * Optimisation 42–56, Scaling 56–84. One source of truth for the roadmap,
 * the countdown, the timeline and the seeded step dates.
 */
export const PHASE_DAYS: Record<number, [number, number]> = {
  1: [0, 14],
  2: [14, 28],
  3: [28, 35],
  4: [35, 42],
  5: [42, 56],
  6: [56, 84],
};

/** The same windows expressed in weeks, for anything that still reads weeks. */
export const PHASE_WEEKS: Record<number, [number, number]> = Object.fromEntries(
  Object.entries(PHASE_DAYS).map(([id, [from, to]]) => [Number(id), [from / 7, to / 7]]),
) as Record<number, [number, number]>;

type Template = {
  title: string;
  owner: string;
  /** Fraction through the phase window where this should land (0–1). */
  at?: number;
  detail?: string;
  clientVisible?: boolean;
  /** Only for these delivery paths. Defaults to all three. */
  only?: ProgramKind[];
};

/**
 * Every phase is now a scripted step-by-step journey and lives in
 * journey-steps.ts, so there is no generic checklist left to seed.
 */
export const PHASE_TEMPLATES: Record<number, Template[]> = {};

function addDays(start: Date, days: number) {
  const date = new Date(start);
  date.setDate(date.getDate() + Math.round(days));
  return date.toISOString().slice(0, 10);
}

type SeedClient = {
  id: string;
  program?: string | null;
  journey_start?: string | null;
  joined_date?: string | null;
  vsl_writer?: string | null;
  extension_days?: number | null;
};

export function startDate(client: SeedClient) {
  const value = client.journey_start ?? client.joined_date ?? new Date().toISOString();
  return new Date(value.length <= 10 ? `${value}T00:00:00` : value);
}

function shiftDays(client: SeedClient) {
  return client.extension_days ?? 0;
}

/** The exact start and end date of one phase for one client. */
export function phaseWindow(client: SeedClient, phaseId: number) {
  const start = startDate(client);
  const [from, to] = PHASE_DAYS[phaseId] ?? [0, 14];
  const shift = shiftDays(client);
  return {
    from: new Date(addDays(start, from + (from ? shift : 0))),
    to: new Date(addDays(start, to + shift)),
    fromIso: addDays(start, from + (from ? shift : 0)),
    toIso: addDays(start, to + shift),
  };
}

/** Expected dates for the scripted steps of a phase, spread over its window. */
export function phaseStepDates(client: SeedClient) {
  const start = startDate(client);
  const shift = shiftDays(client);
  return (phaseId: number) => {
    const [from, to] = PHASE_DAYS[phaseId] ?? [0, 14];
    const count = (STEPS_BY_PHASE[phaseId] ?? []).length || 1;
    return (index: number) =>
      addDays(start, from + shift + ((to - from) * (index + 1)) / (count + 1));
  };
}

/** Builds the full standard task list for one client, with expected dates. */
export function buildStandardTasks(client: SeedClient): TaskInsert[] {
  const kind = programKind(client.program);
  const start = startDate(client);
  const dates = phaseStepDates(client);
  const rows: TaskInsert[] = Object.keys(STEPS_BY_PHASE)
    .map(Number)
    .flatMap((phaseId) => buildPhaseSteps(client, phaseId, dates(phaseId)));

  for (const [phaseKey, templates] of Object.entries(PHASE_TEMPLATES)) {
    const phaseId = Number(phaseKey);
    const [fromWeek, toWeek] = PHASE_WEEKS[phaseId] ?? [0, 1];
    const list = templates.filter((item) => !item.only || item.only.includes(kind));
    list.forEach((item, index) => {
      const at = item.at ?? (index + 1) / (list.length + 1);
      rows.push({
        client_id: client.id,
        phase_id: phaseId,
        title: item.title,
        owner: item.owner,
        detail: item.detail ?? null,
        status: "to_come",
        priority: "medium",
        client_visible: item.clientVisible ?? true,
        sort_order: index,
        template_index: index,
        expected_date: addDays(start, fromWeek * 7 + (toWeek - fromWeek) * 7 * at),
      });
    });
  }

  return rows;
}

/** Loads the standard checklist onto a client that has none yet. */
export function useSeedStandardTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (client: Parameters<typeof buildStandardTasks>[0]) => {
      const rows = buildStandardTasks(client);
      const { error } = await supabase.from("client_tasks").insert(rows as never);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_tasks"] }),
  });
}
