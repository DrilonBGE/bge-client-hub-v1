import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { TEAM, type Client, type PhaseRow } from "@/lib/bge";
import { ShowMore } from "@/components/bge/ShowMore";
import { EmptyState, SectionCard } from "@/components/bge/atoms";
import { useTasks } from "@/lib/journey-queries";
import { daysTo, formatDate, isOpen, statusMeta } from "@/lib/journey";
import { taskHref } from "@/components/bge/client-modal-context";

/**
 * The standard journey tasks that come with a client's current phase — not
 * hand-written to-dos. Scoped to mine, a teammate's or everyone's work.
 */
export function StandardTaskBoard({
  clients,
  phases,
  me,
  onOpenClient,
  focusPerson,
}: {
  clients: Client[];
  phases: PhaseRow[];
  me: string;
  onOpenClient?: (id: string) => void;
  focusPerson?: string | null | undefined;
}) {
  const { data: tasks = [] } = useTasks();
  const [scope, setScope] = useState<"mine" | "person" | "all">("mine");
  const [person, setPerson] = useState(me || TEAM[0]);

  // Picking someone in the team overview switches this list to their work.
  useEffect(() => {
    if (!focusPerson) return;
    setPerson(focusPerson);
    setScope("person");
  }, [focusPerson]);

  const rows = useMemo(() => {
    const byId = new Map(clients.map((c) => [c.id, c]));
    const target = (scope === "mine" ? me : person) ?? "";
    return tasks
      .filter((task) => {
        const client = byId.get(task.client_id);
        // Only the phase the client is actually in right now.
        if (!client || client.phase !== task.phase_id) return false;
        if (!isOpen(task)) return false;
        if (task.owner === "Client") return false;
        if (scope === "all") return true;
        return (task.owner ?? "").toLowerCase() === target.toLowerCase();
      })
      .map((task) => ({ task, client: byId.get(task.client_id)! }))
      .sort((a, b) =>
        (a.task.expected_date ?? "9999").localeCompare(b.task.expected_date ?? "9999"),
      );
  }, [tasks, clients, scope, person, me]);

  return (
    <SectionCard
      title="Standard phase tasks"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            {(
              [
                ["mine", "Mine"],
                ["person", "Teammate"],
                ["all", "Everyone"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setScope(key)}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-semibold transition-colors",
                  scope === key ? "ember-fill" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {scope === "person" && (
            <select
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              className="h-7 rounded-md border border-input bg-card px-1.5 text-[11px]"
            >
              {TEAM.map((t) => (
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
        <EmptyState>
          No standard phase work waiting here. Everything for these clients is done or with the
          client.
        </EmptyState>
      ) : (
        <ShowMore
          items={rows}
          limit={4}
          noun="more tasks"
          className="space-y-1.5"
          render={({ task, client }) => {
            const phase = phases.find((p) => p.phase_id === task.phase_id);
            const late = task.expected_date && (daysTo(task.expected_date) ?? 1) < 0;
            return (
              <div
                key={task.id}
                className="rounded-lg border border-border bg-background px-3 py-2 transition-colors hover:border-primary/50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-medium">{task.title}</p>
                  <span className="text-[11px]" style={{ color: statusMeta(task.status).colour }}>
                    {statusMeta(task.status).label}
                  </span>
                  <span className="flex-1" />
                  <span
                    className={cn(
                      "num text-[11px] text-muted-foreground",
                      late && "text-destructive",
                    )}
                  >
                    {formatDate(task.expected_date)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                  <button
                    onClick={() => onOpenClient?.(client.id)}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {client.name}
                  </button>
                  <span>{phase?.name ?? `Phase ${task.phase_id}`}</span>
                  <span>{task.owner ?? "Unassigned"}</span>
                  <a
                    href={taskHref(client.id, task.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
                    Open task
                  </a>
                </div>
              </div>
            );
          }}
        />
      )}
    </SectionCard>
  );
}
