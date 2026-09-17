import { useMemo, useState } from "react";
import { Plus, Trash2, CalendarClock, User2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { TEAM, type Client } from "@/lib/bge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ShowMore } from "@/components/bge/ShowMore";
import { EmptyState, SectionCard } from "@/components/bge/atoms";
import { useTodoMutations, useTodos } from "@/lib/queries";
import {
  PRIORITIES,
  daysLeft,
  priorityStyle,
  shortDate,
  sortTasks,
  sourceLabel,
  type TaskRow,
} from "@/lib/tasks";
import { taskHref } from "@/components/bge/client-modal-context";

function PriorityChip({ priority }: { priority: string | null | undefined }) {
  const meta = priorityStyle(priority);
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{
        color: meta.colour,
        backgroundColor: `color-mix(in oklab, ${meta.colour} 14%, transparent)`,
      }}
    >
      {meta.label}
    </span>
  );
}

function DueChip({ due }: { due: string | null | undefined }) {
  const days = daysLeft(due);
  if (!due) return <span className="text-[11px] text-muted-foreground">No deadline</span>;
  const late = days !== null && days < 0;
  const soon = days !== null && days >= 0 && days <= 2;
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold",
        late
          ? "bg-destructive/12 text-destructive"
          : soon
            ? "bg-warning/15 text-warning"
            : "bg-muted text-muted-foreground",
      )}
    >
      <CalendarClock className="size-3" />
      {late ? `${Math.abs(days)}d late` : shortDate(due)}
    </span>
  );
}

export function TaskBoard({
  clients,
  me,
  onOpenClient,
  title = "My outstanding tasks",
}: {
  clients: Client[];
  me: string;
  onOpenClient?: (id: string) => void;
  title?: string;
}) {
  const { data: todos } = useTodos();
  const { add, toggle, remove } = useTodoMutations();

  const [scope, setScope] = useState<"mine" | "person" | "all">("mine");
  const [person, setPerson] = useState(me || TEAM[0]);

  const [text, setText] = useState("");
  const [owner, setOwner] = useState(me || TEAM[0]);
  const [priority, setPriority] = useState<string>("medium");
  const [due, setDue] = useState("");
  const [clientId, setClientId] = useState("");
  const [detail, setDetail] = useState("");
  const [openForm, setOpenForm] = useState(false);

  const rows = useMemo(() => {
    const all = ((todos ?? []) as TaskRow[]).filter((t) => !t.done);
    const target = scope === "mine" ? me : person;
    const scoped =
      scope === "all"
        ? all
        : all.filter((t) => (t.owner ?? "").toLowerCase() === (target ?? "").toLowerCase());
    return sortTasks(scoped);
  }, [todos, scope, person, me]);

  return (
    <SectionCard
      title={title}
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
          <Button size="sm" variant="outline" onClick={() => setOpenForm((v) => !v)}>
            <Plus className="size-3.5" /> Assign
          </Button>
        </div>
      }
    >
      {openForm && (
        <form
          className="mb-4 grid gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!text.trim()) return;
            const client = clients.find((c) => c.id === clientId);
            add.mutate({
              text: text.trim(),
              owner,
              due_date: due,
              priority,
              detail,
              issued_by: me || "Team",
              source: "manual",
              client_id: client?.id ?? null,
              client_name: client?.name ?? null,
            });
            setText("");
            setDetail("");
            setDue("");
          }}
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What needs doing?"
            className="h-9 sm:col-span-2"
          />
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="h-9 rounded-md border border-input bg-card px-2 text-[13px]"
          >
            {TEAM.map((t) => (
              <option key={t} value={t}>
                For {t}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="h-9 rounded-md border border-input bg-card px-2 text-[13px]"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {priorityStyle(p).label} priority
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="h-9"
            aria-label="Deadline"
          />
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="h-9 rounded-md border border-input bg-card px-2 text-[13px]"
          >
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Input
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Extra detail (optional)"
            className="h-9 sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" className="ember-fill">
              <Plus className="size-3.5" /> Add task
            </Button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <EmptyState>Nothing outstanding here. Nice.</EmptyState>
      ) : (
        <ShowMore
          items={rows}
          limit={4}
          noun="more tasks"
          className="space-y-1.5"
          render={(task) => (
            <li
              key={task.id}
              className="rounded-lg border border-border bg-background px-3 py-2 transition-colors hover:border-primary/50"
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:flex">
                <Checkbox
                  checked={task.done}
                  onCheckedChange={(v) => toggle.mutate({ id: task.id, done: !!v })}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityChip priority={task.priority} />
                    <p className="text-[13px] font-medium">{task.text}</p>
                    {task.source === "client" && (
                      <span className="rounded bg-primary/12 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                        Client set the task
                      </span>
                    )}
                  </div>
                  {task.detail && (
                    <p className="mt-0.5 text-[12px] text-muted-foreground">{task.detail}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <User2 className="size-3" />
                      {task.owner ?? "Unassigned"}
                    </span>
                    <span>Issued by {task.issued_by ?? sourceLabel(task.source)}</span>
                    <span className="num">Set {shortDate(task.created_at)}</span>
                    {task.client_name && (
                      <button
                        onClick={() => task.client_id && onOpenClient?.(task.client_id)}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {task.client_name}
                      </button>
                    )}
                    {task.client_id && (
                      <a
                        href={taskHref(task.client_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-primary hover:underline"
                      >
                        Open task
                      </a>
                    )}
                  </div>
                </div>
                <div className="col-start-2 flex shrink-0 items-center justify-end gap-2 sm:col-start-auto">
                  <DueChip due={task.due_date} />
                  <button
                    onClick={() => remove.mutate(task.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete task"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </li>
          )}
        />
      )}
    </SectionCard>
  );
}
