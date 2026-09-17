import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MONTH_DAYS: Record<string, number> = {
  january: 31,
  february: 29,
  march: 31,
  april: 30,
  may: 31,
  june: 30,
  july: 31,
  august: 31,
  september: 30,
  october: 31,
  november: 30,
  december: 31,
};

/** "31st November" is impossible — flag it instead of crashing or rolling over. */
export function isSuspectLeaving(value?: string | null): boolean {
  if (!value) return false;
  const match = /^\s*(\d{1,2})\s*(?:st|nd|rd|th)?\s+([A-Za-z]+)/.exec(value);
  if (!match) return false;
  const day = Number(match[1]);
  const days = MONTH_DAYS[(match[2] ?? "").toLowerCase()];
  if (!days) return false;
  return day > days;
}

export type SheetSyncResult = {
  ok: boolean;
  error?: string;
  fetched?: number;
  newRows?: number;
  updates?: number;
  links?: number;
  missing?: number;
};

/** Manual "Sync sheet" for any signed-in team member. */
export const syncActiveClientSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SheetSyncResult> => {
    const { runSheetSync } = await import("@/lib/sheet-sync.server");
    return runSheetSync(context.supabase);
  });
