import { useMemo, useState } from "react";
import { EyeOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PHASE_COLOURS, TEAM, type Client, type PhaseRow } from "@/lib/bge";
import {
  DELAY_CAUSES,
  PRIORITIES,
  SLA_DAYS,
  STATUSES,
  TONE_STYLES,
  daysTo,
  formatDate,
  isOpen,
  priorityColour,
  statusMeta,
  today,
  watchTone,
  type TaskRow,
} from "@/lib/journey";
import { notify, useAddDelay, useDelays, useTaskMutations, useTasks } from "@/lib/journey-queries";
import { logAudit } from "@/lib/queries";
import { EmptyState, FieldLabel } from "@/components/bge/atoms";

const OWNERS = [...TEAM, "Client"] as const;

function Tiny({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly { key: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 rounded-md border border-input bg-card px-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ring/40",
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function TaskLine({ task, clientName }: { task: TaskRow; clientName: string }) {
  const { update, remove } = useTaskMutations();
  const [open, setOpen] = useState(false);
  const tone = watchTone(task);
  const meta = statusMeta(task.status);
  const days = daysTo(task.expected_date);

  const patch = (p: Parameters<typeof update.mutate>[0]["patch"]) =>
    update.mutate({ id: task.id, patch: p });

  const setStatus = (status: string) => {
    patch({
      status,
      actual_date: status === "done" ? (task.actual_date ?? today()) : task.actual_date,
    });
    void logAudit("task_status", clientName, `${task.title} → ${statusMeta(status).label}`);
    // "Other" always needs an explanation underneath.
    if (status === "other" && !task.status_note) {
      setOpen(true);
      toast.warning("Add a note explaining this status");
    }

    if (status === "waiting_client") {
      void notify({
        client_id: task.client_id,
        audience: "client",
        kind: "waiting",
        title: "We need something from you",
        body: task.title,
      });
    }
    if (status === "done") {
      void notify({
        client_id: task.client_id,
        audience: "client",
        kind: "done",
        title: "Step complete",
        body: task.title,
      });
    }
  };

  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 px-2.5 py-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: meta.colour }}
          title={meta.label}
        />
        <button
          onClick={() => setOpen((v) => !v)}
          className="min-w-0 flex-1 truncate text-left text-[13px] font-medium hover:underline"
        >
          {task.title}
        </button>
        {!task.client_visible && (
          <span title="Hidden from the client">
            <EyeOff className="size-3.5 text-muted-foreground" />
          </span>
        )}
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
          style={{ color: priorityColour(task.priority) }}
        >
          {task.priority}
        </span>
        {isOpen(task) && tone !== "ok" && (
          <span
            className="num rounded px-1.5 py-0.5 text-[11px] font-semibold"
            style={{ color: TONE_STYLES[tone].colour }}
          >
            {days !== null
              ? days < 0
                ? `${Math.abs(days)}d late`
                : `${days}d`
              : TONE_STYLES[tone].label}
          </span>
        )}
        <Tiny value={task.status} onChange={setStatus} options={STATUSES} className="w-[150px]" />
      </div>

      {open && (
        <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Owner</FieldLabel>
            <Tiny
              value={task.owner ?? ""}
              onChange={(owner) => patch({ owner: owner || null })}
              options={[
                { key: "", label: "Not set" },
                ...OWNERS.map((o) => ({ key: o, label: o })),
              ]}
              className="w-full"
            />
          </div>
          <div>
            <FieldLabel>Priority</FieldLabel>
            <Tiny
              value={task.priority}
              onChange={(priority) => patch({ priority })}
              options={PRIORITIES.map((p) => ({ key: p, label: p }))}
              className="w-full"
            />
          </div>
          <div>
            <FieldLabel>Expected date</FieldLabel>
            <Input
              type="date"
              value={task.expected_date ?? ""}
              onChange={(e) => patch({ expected_date: e.target.value || null })}
              className="h-9 bg-card"
            />
          </div>
          <div>
            <FieldLabel>Completed on</FieldLabel>
            <Input
              type="date"
              value={task.actual_date ?? ""}
              onChange={(e) => patch({ actual_date: e.target.value || null })}
              className="h-9 bg-card"
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>What this covers</FieldLabel>
            <Textarea
              defaultValue={task.detail ?? ""}
              onBlur={(e) => patch({ detail: e.target.value || null })}
              className="min-h-16 bg-card"
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>
              Note on the current status
              {task.status === "other" ? " (required)" : ""}
            </FieldLabel>
            <Input
              defaultValue={task.status_note ?? ""}
              placeholder="e.g. waiting on the recordings"
              onBlur={(e) => patch({ status_note: e.target.value || null })}
              className={cn(
                "h-9 bg-card",
                task.status === "other" && !task.status_note && "border-warning",
              )}
            />
          </div>

          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={task.client_visible}
              onChange={(e) => patch({ client_visible: e.target.checked })}
            />
            The client can see this step
          </label>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => {
                if (confirm(`Remove "${task.title}"?`)) remove.mutate(task.id);
              }}
            >
              <Trash2 className="mr-1 size-3.5" /> Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddTask({
  clientId,
  phaseId,
  count,
}: {
  clientId: string;
  phaseId: number;
  count: number;
}) {
  const { add } = useTaskMutations();
  const [title, setTitle] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    add.mutate({ client_id: clientId, phase_id: phaseId, title: title.trim(), sort_order: count });
    setTitle("");
  };

  return (
    <div className="flex gap-2">
      <Input
        value={title}
        placeholder="Add a step to this phase"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="h-9 bg-card"
      />
      <Button size="sm" onClick={submit}>
        <Plus className="size-4" />
      </Button>
    </div>
  );
}

function DelayPanel({ client }: { client: Client }) {
  const { data: delays } = useDelays(client.id);
  const add = useAddDelay();
  const [days, setDays] = useState("1");
  const [reason, setReason] = useState("");
  const [cause, setCause] = useState("client");
  const [visible, setVisible] = useState(false);

  const total = (delays ?? []).reduce((sum, d) => sum + d.days, 0);

  const submit = () => {
    const n = Number(days);
    if (!n || !reason.trim()) {
      toast.error("Add a number of days and a reason.");
      return;
    }
    add.mutate(
      {
        client_id: client.id,
        days: n,
        reason: reason.trim(),
        cause,
        client_visible: visible,
        phase_id: client.phase,
      },
      {
        onSuccess: () => {
          setReason("");
          setDays("1");
          void logAudit("delay_logged", client.name, `+${n} days — ${reason.trim()}`);
          if (visible) {
            void notify({
              client_id: client.id,
              audience: "client",
              kind: "delay",
              title: `Timeline moved by ${n} day${n === 1 ? "" : "s"}`,
              body: reason.trim(),
            });
          }
          toast.success("Delay logged.");
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-20">
          <FieldLabel>Days</FieldLabel>
          <Input
            type="number"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="h-9 bg-card"
          />
        </div>
        <div className="min-w-[180px] flex-1">
          <FieldLabel>Why</FieldLabel>
          <Input
            value={reason}
            placeholder="e.g. recordings came in late"
            onChange={(e) => setReason(e.target.value)}
            className="h-9 bg-card"
          />
        </div>
        <div className="w-[150px]">
          <FieldLabel>Cause</FieldLabel>
          <Tiny value={cause} onChange={setCause} options={DELAY_CAUSES} className="w-full" />
        </div>
        <label className="flex h-9 items-center gap-2 text-[12px]">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Show the client
        </label>
        <Button size="sm" onClick={submit}>
          Log delay
        </Button>
      </div>

      {total > 0 && (
        <p className="text-[12px] font-semibold text-warning">
          Running total: +{total} day{total === 1 ? "" : "s"} behind the original plan
        </p>
      )}

      {(delays ?? []).length === 0 ? (
        <EmptyState>No delays logged — the journey is running to plan.</EmptyState>
      ) : (
        <ul className="space-y-1.5">
          {(delays ?? []).map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-[12px]"
            >
              <span className="num font-semibold text-warning">+{d.days}d</span>
              <span className="min-w-0 flex-1 truncate">{d.reason}</span>
              <span className="text-muted-foreground">
                {DELAY_CAUSES.find((c) => c.key === d.cause)?.label}
              </span>
              {!d.client_visible && <EyeOff className="size-3.5 text-muted-foreground" />}
              <span className="num text-muted-foreground">{formatDate(d.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Roadmap({ client, phases }: { client: Client; phases: PhaseRow[] }) {
  const { data: tasks, isLoading } = useTasks(client.id);
  const byPhase = useMemo(() => {
    const map = new Map<number, TaskRow[]>();
    for (const task of tasks ?? []) {
      const list = map.get(task.phase_id) ?? [];
      list.push(task);
      map.set(task.phase_id, list);
    }
    return map;
  }, [tasks]);

  if (isLoading) return <EmptyState>Loading the roadmap…</EmptyState>;

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-border bg-muted/40 p-3 text-[12px] text-muted-foreground">
        Working agreements: copy within {SLA_DAYS.copy} days, builds within {SLA_DAYS.build} days,
        reviews within {SLA_DAYS.review} days. Anything past its expected date shows in red on the
        team watch list.
      </div>

      {phases.map((phase) => {
        const list = byPhase.get(phase.phase_id) ?? [];
        const done = list.filter((t) => t.status === "done").length;
        const late = list.filter((t) => watchTone(t) === "overdue").length;
        return (
          <section key={phase.phase_id} className="space-y-2">
            <header className="flex flex-wrap items-center gap-2">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: PHASE_COLOURS[phase.phase_id] }}
              />
              <h3 className="text-[13px] font-semibold">
                {phase.label} — {phase.name}
              </h3>
              <span className="num text-[11px] text-muted-foreground">
                {done}/{list.length} done
              </span>
              {late > 0 && (
                <span className="num rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] font-semibold text-destructive">
                  {late} late
                </span>
              )}
            </header>
            <div className="space-y-1.5">
              {list.map((task) => (
                <TaskLine key={task.id} task={task} clientName={client.name} />
              ))}
            </div>
            <AddTask clientId={client.id} phaseId={phase.phase_id} count={list.length} />
          </section>
        );
      })}

      <section className="space-y-2">
        <h3 className="text-[13px] font-semibold">Delays</h3>
        <DelayPanel client={client} />
      </section>
    </div>
  );
}
