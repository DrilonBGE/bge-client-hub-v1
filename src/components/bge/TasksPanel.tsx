import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/bge/atoms";
import { EditRow, LongField, SelectField, TextField } from "@/components/bge/fields";
import { ShowMore } from "@/components/bge/ShowMore";
import { useTaskMutations, useTasks } from "@/lib/journey-queries";
import { STATUSES, formatDate, statusMeta, type TaskRow } from "@/lib/journey";
import { TEAM, phaseColour, type Client, type PhaseRow } from "@/lib/bge";
import { cn } from "@/lib/utils";

const OWNERS = ["Client", ...TEAM] as const;

function TaskCard({
  task,
  colour,
  highlight = false,
}: {
  task: TaskRow;
  colour: string;
  highlight?: boolean;
}) {
  const [open, setOpen] = useState(highlight);
  const { update, remove } = useTaskMutations();
  const set = (patch: Partial<TaskRow>) => update.mutate({ id: task.id, patch });
  const meta = statusMeta(task.status);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (highlight) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlight]);

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-lg border-l-4 border border-border bg-card",
        highlight && "border-primary shadow-ember ring-2 ring-primary/40",
      )}
      style={{ borderLeftColor: colour }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full flex-wrap items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/40"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{task.title}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {task.owner || "Unassigned"} · {formatDate(task.expected_date)}
          </span>
        </span>
        <span className="text-[11px] font-semibold" style={{ color: meta.colour }}>
          {meta.label}
        </span>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="space-y-2.5 border-t border-border p-3">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <EditRow label="Where it is up to">
              <SelectField
                value={task.status}
                empty="Pick a status"
                options={STATUSES.map((status) => status.label)}
                onSave={(label) =>
                  set({ status: STATUSES.find((s) => s.label === label)?.key ?? "to_come" })
                }
              />
            </EditRow>
            <EditRow label="Who is doing it">
              <SelectField value={task.owner} options={OWNERS} onSave={(owner) => set({ owner })} />
            </EditRow>
            <EditRow label="Expected date">
              <TextField
                value={task.expected_date}
                type="date"
                onSave={(expected_date) => set({ expected_date: expected_date || null })}
              />
            </EditRow>
          </div>
          <EditRow label="Details">
            <LongField value={task.detail} onSave={(detail) => set({ detail })} />
          </EditRow>
          <EditRow label="Status note" internal>
            <LongField
              value={task.status_note}
              placeholder="Anything worth remembering about this one"
              onSave={(status_note) => set({ status_note })}
            />
          </EditRow>
          <Button size="sm" variant="ghost" onClick={() => remove.mutate(task.id)}>
            <Trash2 className="mr-1 size-4" /> Delete task
          </Button>
        </div>
      )}
    </div>
  );
}

function AddTask({ client, phases }: { client: Client; phases: PhaseRow[] }) {
  const { add } = useTaskMutations();
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState<string>("Drilon");
  // 0 means "Other" — we do not know which phase this belongs to yet.
  const [phase, setPhase] = useState<number>(client.phase || 1);
  const [date, setDate] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    add.mutate({
      client_id: client.id,
      phase_id: phase,
      title: title.trim(),
      owner,
      priority: "medium",
      status: "to_come",
      expected_date: date || null,
      sort_order: 999,
    });
    setTitle("");
    setDate("");
  };

  return (
    <div className="rounded-xl border border-border p-3">
      <p className="mb-2 text-[12px] font-semibold">Add a task</p>
      <div className="flex flex-wrap items-end gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs doing?"
          className="h-9 min-w-52 flex-1 bg-background text-sm"
        />
        <select
          value={owner}
          onChange={(event) => setOwner(event.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {OWNERS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select
          value={phase}
          onChange={(event) => setPhase(Number(event.target.value))}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {phases.map((item) => (
            <option key={item.phase_id} value={item.phase_id}>
              {item.label}
            </option>
          ))}
          <option value={0}>Other / not sure</option>
        </select>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {!date && <span>Date N/A</span>}
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-9 w-40 bg-background text-sm"
          />
        </label>
        <Button size="sm" onClick={submit}>
          <Plus className="mr-1 size-4" /> Add
        </Button>
      </div>
    </div>
  );
}

/** Standard phase tasks, split phase by phase, plus the tasks people add by hand. */
export function TasksPanel({
  client,
  phases,
  focusTask,
}: {
  client: Client;
  phases: PhaseRow[];
  focusTask?: string | null | undefined;
}) {
  const { data: tasks = [] } = useTasks(client.id);
  const [phase, setPhase] = useState<number>(client.phase || 1);
  const focused = useMemo(
    () => (focusTask ? tasks.find((task) => task.id === focusTask) : undefined),
    [tasks, focusTask],
  );

  // Land on the phase the linked task belongs to, so its section makes sense.
  useEffect(() => {
    if (focused) setPhase(focused.phase_id);
  }, [focused]);

  const standard = useMemo(
    () =>
      tasks.filter(
        (task) =>
          (Boolean(task.step_key) || task.template_index !== null) && task.phase_id === phase,
      ),
    [tasks, phase],
  );
  const assigned = useMemo(
    () => tasks.filter((task) => !task.step_key && task.template_index === null),
    [tasks],
  );

  return (
    <div className="space-y-6">
      {focused && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-primary">The task you opened</h3>
          <TaskCard task={focused} colour={phaseColour(focused.phase_id)} highlight />
        </section>
      )}

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Standard phase tasks</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {phases.find((item) => item.phase_id === phase)?.label ?? `Phase ${phase}`} ·{" "}
            {phases.find((item) => item.phase_id === phase)?.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {phases.map((item) => (
            <button
              key={item.phase_id}
              type="button"
              onClick={() => setPhase(item.phase_id)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-all",
                phase === item.phase_id
                  ? "text-white"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
              style={
                phase === item.phase_id
                  ? {
                      backgroundColor: phaseColour(item.phase_id),
                      borderColor: phaseColour(item.phase_id),
                    }
                  : undefined
              }
            >
              {item.label} · {item.name}
            </button>
          ))}
        </div>
        {standard.length === 0 ? (
          <EmptyState>No standard tasks on this phase yet.</EmptyState>
        ) : (
          <ShowMore
            items={standard}
            limit={5}
            noun="more tasks"
            render={(task) => (
              <TaskCard key={task.id} task={task} colour={phaseColour(task.phase_id)} />
            )}
          />
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Custom tasks</h3>
        <AddTask client={client} phases={phases} />
        {assigned.length === 0 ? (
          <EmptyState>Nothing assigned by hand yet.</EmptyState>
        ) : (
          <ShowMore
            items={assigned}
            limit={4}
            noun="more tasks"
            render={(task) => (
              <TaskCard key={task.id} task={task} colour={phaseColour(task.phase_id)} />
            )}
          />
        )}
      </section>
    </div>
  );
}
