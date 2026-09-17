import { useMemo, useState } from "react";
import { Bell, ChevronDown, ChevronUp, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/journey";
import { useNotifications } from "@/lib/journey-queries";
import { useMyPrefs, useUpdatePrefs } from "@/lib/prefs";

/**
 * The orange strip at the top of the dashboard: everything that has happened
 * since the last time this person checked in, so nothing gets missed.
 */
export function NoticeBar() {
  const { data: items = [] } = useNotifications("team");
  const { data: prefs } = useMyPrefs();
  const update = useUpdatePrefs();
  const [open, setOpen] = useState(false);

  const since = prefs?.last_seen_at ?? new Date(0).toISOString();
  const fresh = useMemo(() => items.filter((n) => n.created_at > since), [items, since]);

  if (fresh.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-primary/40 bg-primary/10 shadow-card">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-3 py-3 sm:flex sm:flex-wrap sm:px-4">
        <span className="ember-fill flex size-8 shrink-0 items-center justify-center rounded-full shadow-ember">
          <Bell className="size-4" />
        </span>
        <p className="min-w-0 flex-1 text-[13px] font-semibold text-primary">
          You have {fresh.length} new {fresh.length === 1 ? "update" : "updates"} since you last
          checked.
        </p>
        <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1">
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-primary/40 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
          >
            {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {open ? "Hide" : "Show summary"}
          </button>
          <button
            onClick={() => update.mutate({ last_seen_at: new Date().toISOString() })}
            className="inline-flex items-center gap-1 rounded-md border border-primary/40 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
          >
            <Check className="size-3.5" /> Mark all seen
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-primary/25 transition-[max-height]",
          open ? "max-h-80" : "max-h-0 border-transparent",
        )}
      >
        <ul className="max-h-80 overflow-y-auto bg-card/70">
          {fresh.map((n) => (
            <li key={n.id} className="border-b border-border px-4 py-2 text-[12px] last:border-0">
              <p className="font-medium">{n.title}</p>
              {n.body && <p className="text-muted-foreground">{n.body}</p>}
              <p className="num mt-0.5 text-[10px] text-muted-foreground">
                {formatDate(n.created_at)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
