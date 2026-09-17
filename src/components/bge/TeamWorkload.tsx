import { useMemo } from "react";

import { EmptyState, SectionCard } from "@/components/bge/atoms";
import { TEAM, type Client } from "@/lib/bge";
import { useTasks } from "@/lib/journey-queries";
import { useTodos } from "@/lib/queries";
import { daysTo, formatDate, isOpen } from "@/lib/journey";
import { cn } from "@/lib/utils";

type Row = {
  name: string;
  open: number;
  late: number;
  next: string | null;
};

/**
 * One line per team member — how much is open, how much is late and the next
 * deadline — so you can see Alfie's or William's load without digging.
 */
export function TeamWorkload({
  clients,
  selected,
  onSelect,
}: {
  clients: Client[];
  selected?: string | null | undefined;
  onSelect?: (name: string) => void;
}) {
  const { data: tasks = [] } = useTasks();
  const { data: todos = [] } = useTodos();

  const rows = useMemo<Row[]>(() => {
    const liveClients = new Set(clients.map((c) => c.id));
    const byOwner = new Map<string, { dates: string[]; count: number; late: number }>();
    const bump = (owner: string | null | undefined, date: string | null | undefined) => {
      const key = (owner ?? "").trim();
      if (!key) return;
      const entry = byOwner.get(key) ?? { dates: [], count: 0, late: 0 };
      entry.count += 1;
      if (date) {
        entry.dates.push(date);
        if ((daysTo(date) ?? 1) < 0) entry.late += 1;
      }
      byOwner.set(key, entry);
    };

    for (const task of tasks) {
      if (!liveClients.has(task.client_id)) continue;
      if (!isOpen(task) || task.owner === "Client") continue;
      bump(task.owner, task.expected_date);
    }
    for (const todo of todos) {
      if (todo.done) continue;
      bump(todo.owner, todo.due_date);
    }

    return TEAM.map((name) => {
      const entry = byOwner.get(name);
      const dates = (entry?.dates ?? []).slice().sort();
      return {
        name,
        open: entry?.count ?? 0,
        late: entry?.late ?? 0,
        next: dates[0] ?? null,
      };
    }).sort((a, b) => b.late - a.late || b.open - a.open);
  }, [tasks, todos, clients]);

  const total = rows.reduce((sum, row) => sum + row.open, 0);

  return (
    <SectionCard title="Who is carrying what">
      {total === 0 ? (
        <EmptyState>Nothing open across the team right now.</EmptyState>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <button
              key={row.name}
              type="button"
              onClick={() => onSelect?.(row.name)}
              className={cn(
                "rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/60",
                selected === row.name && "border-primary shadow-ember",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold">{row.name}</span>
                <span className="num ml-auto text-[13px] font-bold text-primary">{row.open}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {row.late > 0 ? (
                  <span className="font-semibold text-destructive">{row.late} late</span>
                ) : (
                  "Nothing late"
                )}
                {row.next ? ` · next ${formatDate(row.next)}` : " · no deadlines"}
              </p>
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
