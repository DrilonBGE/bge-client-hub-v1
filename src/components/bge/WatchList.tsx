import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { TEAM, type Client } from "@/lib/bge";
import {
  TONE_STYLES,
  daysTo,
  formatDate,
  isOpen,
  statusMeta,
  watchTone,
  type WatchTone,
} from "@/lib/journey";
import { useTasks } from "@/lib/journey-queries";
import { EmptyState, SectionCard } from "@/components/bge/atoms";
import { useBoard } from "@/components/bge/client-modal-context";

const ORDER: WatchTone[] = ["overdue", "today", "soon", "waiting", "ok"];

export function WatchList({ clients, me }: { clients: Client[]; me: string }) {
  const { data: tasks } = useTasks();
  const { openClient } = useBoard();
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [owner, setOwner] = useState<string>(me);

  const names = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const rows = useMemo(() => {
    const open = (tasks ?? []).filter(isOpen).filter((t) => names.has(t.client_id));
    const scoped =
      scope === "all"
        ? open
        : open.filter((t) => (t.owner ?? "").toLowerCase() === owner.toLowerCase());
    return scoped
      .map((task) => ({ task, tone: watchTone(task) }))
      .filter((r) => r.tone !== "ok")
      .sort((a, b) => {
        const byTone = ORDER.indexOf(a.tone) - ORDER.indexOf(b.tone);
        if (byTone !== 0) return byTone;
        return (a.task.expected_date ?? "9999").localeCompare(b.task.expected_date ?? "9999");
      })
      .slice(0, 40);
  }, [tasks, scope, owner, names]);

  return (
    <SectionCard
      title="Nothing gets forgotten"
      action={
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            {(["mine", "all"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setScope(key)}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-medium",
                  scope === key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {key === "mine" ? "One person" : "Everyone"}
              </button>
            ))}
          </div>
          {scope === "mine" && (
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="h-7 rounded-md border border-input bg-card px-1.5 text-[11px]"
            >
              {[...TEAM, "Client"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>
      }
    >
      {rows.length === 0 ? (
        <EmptyState>Nothing needs chasing right now.</EmptyState>
      ) : (
        <ul className="space-y-1.5">
          {rows.map(({ task, tone }) => {
            const days = daysTo(task.expected_date);
            return (
              <li key={task.id}>
                <button
                  onClick={() => openClient(task.client_id)}
                  className="flex w-full flex-wrap items-center gap-2 rounded-md border border-border px-2.5 py-2 text-left text-[12px] hover:bg-accent"
                >
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                    style={{ color: TONE_STYLES[tone].colour }}
                  >
                    {TONE_STYLES[tone].label}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{task.title}</span>
                  <span className="truncate text-muted-foreground">
                    {names.get(task.client_id)}
                  </span>
                  <span className="text-muted-foreground">{task.owner ?? "No owner"}</span>
                  <span className="text-muted-foreground">{statusMeta(task.status).label}</span>
                  <span className="num text-muted-foreground">
                    {days !== null && days < 0
                      ? `${Math.abs(days)}d late`
                      : formatDate(task.expected_date)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
