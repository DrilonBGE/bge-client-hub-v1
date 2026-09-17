import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/** Everything a team member can switch on or off on their own dashboard. */
export const DASHBOARD_WIDGETS = [
  {
    key: "notice_bar",
    label: "New notifications banner",
    hint: "A summary at the top of everything that happened since you last looked.",
  },
  {
    key: "custom_tasks",
    label: "Custom tasks",
    hint: "Tasks we or the client create by hand.",
  },
  {
    key: "standard_tasks",
    label: "Standard phase tasks",
    hint: "The work that appears automatically as clients move through the phases.",
  },
  {
    key: "sheet_inbox",
    label: "Active client sheet check",
    hint: "A one-line summary of anything the sheet disagrees with.",
  },
  {
    key: "phase_overview",
    label: "Where everyone is right now",
    hint: "Every client grouped by the phase they are in.",
  },
  {
    key: "client_health",
    label: "Client health",
    hint: "Every client in health order, the ones at risk first.",
    off: true,
  },
  {
    key: "renewals",
    label: "Renewals coming up",
    hint: "Anyone whose programme ends in the next 60 days.",
    off: true,
  },
  {
    key: "upsells",
    label: "Upsells still on the table",
    hint: "Clients not yet on Amalor or SpeakScript Scale.",
    off: true,
  },
  {
    key: "team_workload",
    label: "Who is carrying what",
    hint: "One line per team member with what is open and what is late.",
    off: true,
  },
  {
    key: "phase_moves",
    label: "Who just moved on",
    hint: "Recent phase changes across every client.",
    off: true,
  },
  {
    key: "watch_list",
    label: "Watch list",
    hint: "Everything overdue, due today or waiting, grouped by urgency.",
    off: true,
  },
  {
    key: "for_you",
    label: "For you",
    hint: "Notifications and hand-offs pointed straight at you.",
    off: true,
  },
] as const;

export type WidgetKey = (typeof DASHBOARD_WIDGETS)[number]["key"];

const OFF_BY_DEFAULT = new Set(
  DASHBOARD_WIDGETS.filter((widget) => "off" in widget && widget.off).map((widget) => widget.key),
);

export type Prefs = {
  widgets: Record<string, boolean>;
  widget_order: string[];
  last_seen_at: string;
};

const FALLBACK: Prefs = { widgets: {}, widget_order: [], last_seen_at: new Date(0).toISOString() };

/**
 * Most panels are on unless the person switched them off. The extra ones people
 * asked to be able to add back start hidden until they turn them on.
 */
export function widgetOn(prefs: Prefs | undefined, key: WidgetKey) {
  const saved = prefs?.widgets?.[key];
  if (typeof saved === "boolean") return saved;
  return !OFF_BY_DEFAULT.has(key);
}

const DEFAULT_ORDER = DASHBOARD_WIDGETS.map((widget) => widget.key);

/**
 * The order somebody dragged their panels into, with any panel they have never
 * seen appended at the end so nothing can go missing.
 */
export function widgetOrder(prefs: Prefs | undefined): WidgetKey[] {
  const saved = (prefs?.widget_order ?? []).filter((key): key is WidgetKey =>
    DEFAULT_ORDER.includes(key as WidgetKey),
  );
  return [...saved, ...DEFAULT_ORDER.filter((key) => !saved.includes(key))];
}

export function useMyPrefs() {
  return useQuery({
    queryKey: ["user_prefs"],
    queryFn: async (): Promise<Prefs> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return FALLBACK;
      const { data, error } = await supabase
        .from("user_prefs")
        .select("widgets,widget_order,last_seen_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return FALLBACK;
      const order = data.widget_order;
      return {
        widgets: (data.widgets ?? {}) as Record<string, boolean>,
        widget_order: Array.isArray(order) ? (order as string[]) : [],
        last_seen_at: data.last_seen_at,
      };
    },
    staleTime: 30_000,
  });
}

export function useUpdatePrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: {
      widgets?: Record<string, boolean>;
      widget_order?: string[];
      last_seen_at?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;
      const { error } = await supabase
        .from("user_prefs")
        .upsert({ user_id: userId, ...patch } as never, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_prefs"] }),
  });
}
