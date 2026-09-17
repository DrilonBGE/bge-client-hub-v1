import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PHASE_COLOURS, type Client, type PhaseRow } from "@/lib/bge";
import { formatDate, type TaskRow } from "@/lib/journey";
import { useRequestMutations, useTaskMutations, useTasks } from "@/lib/journey-queries";
import { useUpdateClient } from "@/lib/queries";
import { phaseWindow } from "@/lib/task-templates";
import { DelaysAndPauses } from "@/components/bge/DelaysAndPauses";

const DAY = 86400000;

function toDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(start: Date, days: number) {
  const date = new Date(start);
  date.setDate(date.getDate() + Math.round(days));
  return date;
}

type Point = {
  phase: PhaseRow;
  expectedStart: Date;
  expectedEnd: Date;
  actualEnd: Date | null;
  actualStart: Date | null;
  colour: string;
};

/** Where each phase was meant to finish, and where it really did. */
function buildPoints(phases: PhaseRow[], tasks: TaskRow[], client: Client): Point[] {
  return phases.map((phase) => {
    const list = tasks.filter((task) => task.phase_id === phase.phase_id);
    const done = list.filter((task) => task.status === "done");
    const complete = list.length > 0 && done.length === list.length;
    const dates = done.map((task) => toDate(task.actual_date)).filter((d): d is Date => Boolean(d));
    const started = list
      .filter((task) => task.status !== "to_come")
      .map((task) => toDate(task.actual_date ?? task.updated_at))
      .filter((d): d is Date => Boolean(d));
    const window = phaseWindow(client, phase.phase_id);
    return {
      phase,
      expectedStart: window.from,
      expectedEnd: window.to,
      actualEnd:
        complete && dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null,
      actualStart: started.length ? new Date(Math.min(...started.map((d) => d.getTime()))) : null,
      colour: PHASE_COLOURS[phase.phase_id] ?? "var(--primary)",
    };
  });
}

function Track({
  label,
  tone,
  points,
  start,
  span,
  kind,
  progress,
}: {
  label: string;
  tone: string;
  points: Point[];
  start: Date;
  span: number;
  kind: "expected" | "actual";
  progress: number;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="relative h-16">
        <span className={cn("absolute inset-x-0 top-4 h-1 rounded-full", tone)} />
        <span
          className="ember-fill absolute left-0 top-4 h-1 rounded-full shadow-ember transition-[width] duration-700"
          style={{ width: `${progress}%` }}
        />
        {points.map((point) => {
          const date = kind === "expected" ? point.expectedEnd : point.actualEnd;
          if (!date) return null;
          const pct = Math.min(100, Math.max(0, ((date.getTime() - start.getTime()) / span) * 100));
          const late =
            kind === "actual" && point.actualEnd
              ? point.actualEnd.getTime() > point.expectedEnd.getTime()
              : false;
          return (
            <div
              key={point.phase.phase_id}
              className="absolute top-0 -translate-x-1/2 text-center"
              style={{ left: `${pct}%` }}
            >
              <span
                className="mx-auto block size-3 rounded-full ring-2 ring-background"
                style={{ backgroundColor: point.colour }}
                title={`${point.phase.name} — ${formatDate(date.toISOString())}`}
              />
              <span className="mt-1 block whitespace-nowrap text-[9px] font-semibold uppercase text-muted-foreground">
                P{point.phase.phase_id}
              </span>
              <span
                className={cn(
                  "num block whitespace-nowrap text-[9px]",
                  late ? "text-warning" : "text-muted-foreground",
                )}
              >
                {formatDate(date.toISOString())}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
/**
 * Every step with its own expected date. A date set by hand here is kept even
 * when the journey start date moves; "Back to plan" hands it back to the
 * standard schedule.
 */
function StepDates({
  client,
  phases,
  tasks,
}: {
  client: Client;
  phases: PhaseRow[];
  tasks: TaskRow[];
}) {
  const { update } = useTaskMutations();

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-sm font-semibold">Dates for each step</p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Every date comes from the journey start date. Change one here if a step genuinely needs
        longer, and say why — the client can read the reason.
      </p>
      <div className="mt-3 space-y-4">
        {phases.map((phase) => {
          const list = tasks
            .filter((task) => task.phase_id === phase.phase_id)
            .sort((a, b) => (a.gate_order ?? 0) - (b.gate_order ?? 0));
          if (!list.length) return null;
          const window = phaseWindow(client, phase.phase_id);
          return (
            <div key={phase.phase_id}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {phase.name} · {formatDate(window.fromIso)} — {formatDate(window.toIso)}
              </p>
              <div className="mt-1.5 space-y-1.5">
                {list.map((task) => (
                  <div
                    key={task.id}
                    className="grid items-center gap-2 rounded-md border border-border px-2.5 py-2 sm:grid-cols-[1fr_9rem_1fr_auto]"
                  >
                    <span className="truncate text-[13px]">{task.title}</span>
                    <Input
                      type="date"
                      value={task.expected_date ?? ""}
                      onChange={(event) =>
                        update.mutate({
                          id: task.id,
                          patch: {
                            expected_date: event.target.value || null,
                            date_locked: Boolean(event.target.value),
                          } as never,
                        })
                      }
                      className="h-8 bg-background text-xs"
                    />
                    <Input
                      key={`note-${task.id}-${task.date_note ?? ""}`}
                      defaultValue={task.date_note ?? ""}
                      placeholder="Why this date moved"
                      onBlur={(event) => {
                        if ((task.date_note ?? "") === event.target.value) return;
                        update.mutate({
                          id: task.id,
                          patch: { date_note: event.target.value || null } as never,
                        });
                      }}
                      className="h-8 bg-background text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!task.date_locked}
                      onClick={() =>
                        update.mutate({
                          id: task.id,
                          patch: { date_locked: false } as never,
                        })
                      }
                      className="h-8 text-[10px] font-bold uppercase tracking-wide"
                    >
                      Back to plan
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The whole journey on two lines: the timeline we promised, and the phase
 * progressions as they actually happened. The team can move the plan; the
 * client can only read it.
 */
export function TimelinePanel({
  client,
  phases,
  clientView = false,
}: {
  client: Client;
  phases: PhaseRow[];
  clientView?: boolean;
}) {
  const { data: tasks = [] } = useTasks(client.id);
  const update = useUpdateClient();
  const { add: addRequest } = useRequestMutations();
  const [changeRequest, setChangeRequest] = useState("");

  const startValue = client.journey_start ?? client.joined_date ?? null;
  const start = useMemo(() => toDate(startValue) ?? new Date(), [startValue]);
  const shift = client.extension_days ?? 0;

  const points = useMemo(() => buildPoints(phases, tasks, client), [phases, tasks, client]);

  const ends = [
    ...points.map((p) => p.expectedEnd.getTime()),
    ...points.map((p) => p.actualEnd?.getTime() ?? 0),
    Date.now(),
  ];
  const span = Math.max(...ends) - start.getTime() + 3 * DAY;

  const finished = points.filter((p) => p.actualEnd);
  const drift = finished.length
    ? Math.round(
        (finished[finished.length - 1]!.actualEnd!.getTime() -
          finished[finished.length - 1]!.expectedEnd.getTime()) /
          DAY,
      )
    : 0;

  const save = (patch: Partial<Client>) => update.mutate({ id: client.id, patch });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Timeline</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            The top line is the plan. The line underneath marks the day each stage was actually
            finished.
          </p>
        </div>
        {Boolean(finished.length) && (
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
              drift > 0
                ? "border-warning/50 bg-warning/10 text-warning"
                : "border-success/50 bg-success/10 text-success",
            )}
          >
            {drift > 0 ? `${drift} days behind plan` : `${Math.abs(drift)} days ahead of plan`}
          </span>
        )}
      </div>

      <div className="space-y-6 rounded-xl border border-border bg-card/60 p-4">
        <Track
          label="Expected timeline"
          tone="bg-border-strong"
          points={points}
          start={start}
          span={span}
          kind="expected"
          progress={Math.max(0, Math.min(100, (client.phase / Math.max(1, phases.length)) * 100))}
        />
        <Track
          label="Actual timeline"
          tone="ember-fill opacity-80"
          points={points}
          start={start}
          span={span}
          kind="actual"
          progress={Math.max(
            0,
            Math.min(100, (finished.length / Math.max(1, phases.length)) * 100),
          )}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {points.map((point) => (
          <div
            key={point.phase.phase_id}
            className="rounded-xl border border-border bg-card/60 p-3"
            style={{ boxShadow: `inset 3px 0 0 0 ${point.colour}` }}
          >
            <p className="text-xs font-semibold">{point.phase.name}</p>
            <p className="num mt-1.5 text-[11px] text-muted-foreground">
              Planned {formatDate(point.expectedStart.toISOString())} —{" "}
              {formatDate(point.expectedEnd.toISOString())}
            </p>

            <p className="num text-[11px] text-muted-foreground">
              {point.actualStart
                ? `Started ${formatDate(point.actualStart.toISOString())}`
                : "Not started yet"}
            </p>
            <p
              className={cn(
                "num text-[11px]",
                point.actualEnd
                  ? point.actualEnd > point.expectedEnd
                    ? "text-warning"
                    : "text-success"
                  : "text-muted-foreground",
              )}
            >
              {point.actualEnd
                ? `Completed ${formatDate(point.actualEnd.toISOString())}`
                : "Not finished yet"}
            </p>
          </div>
        ))}
      </div>

      {!clientView && <StepDates client={client} phases={phases} tasks={tasks} />}

      <DelaysAndPauses client={client} phase={client.phase} clientView={clientView} />

      <div className="rounded-xl border border-border p-4">
        <p className="text-sm font-semibold">The plan</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {clientView
            ? "Your original start date and any agreed changes to the plan."
            : "Only the team can change these. The client reads them but cannot touch them."}
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-[11px] text-muted-foreground">
            Original start date
            {clientView ? (
              <p className="num mt-1 text-sm text-foreground">{formatDate(startValue)}</p>
            ) : (
              <Input
                type="date"
                value={client.journey_start ?? ""}
                onChange={(event) => save({ journey_start: event.target.value || null } as never)}
                className="mt-1 h-9 bg-background text-sm"
              />
            )}
          </label>
          <label className="block text-[11px] text-muted-foreground">
            Days added to the expected timeline
            {clientView ? (
              <p className="num mt-1 text-sm text-foreground">{shift}</p>
            ) : (
              <Input
                key={`shift-${shift}`}
                type="number"
                defaultValue={shift}
                onBlur={(event) => {
                  const days = Number(event.target.value) || 0;
                  if (days === shift) return;
                  save({ extension_days: days } as never);
                }}
                className="mt-1 h-9 bg-background text-sm"
              />
            )}
          </label>
        </div>

        <label className="mt-3 block text-[11px] text-muted-foreground">
          Notes about the expected timeline
          {clientView ? (
            <p className="mt-1 whitespace-pre-line text-[13px] text-foreground">
              {client.extension_note || "No notes yet."}
            </p>
          ) : (
            <Textarea
              key={`note-${client.extension_note ?? ""}`}
              defaultValue={client.extension_note ?? ""}
              rows={3}
              placeholder="Why the plan moved — the client can read this"
              onBlur={(event) => {
                if ((client.extension_note ?? "") === event.target.value) return;
                save({ extension_note: event.target.value || null } as never);
              }}
              className="mt-1 bg-background text-xs"
            />
          )}
        </label>
        {clientView && (
          <div className="mt-4 border-t border-border pt-4">
            <label className="block text-[11px] font-semibold text-muted-foreground">
              Add any changes to the expected plan
              <Textarea
                value={changeRequest}
                onChange={(event) => setChangeRequest(event.target.value)}
                rows={3}
                placeholder="Tell us what has changed"
                className="mt-1 bg-background text-xs"
              />
            </label>
            <Button
              type="button"
              size="sm"
              disabled={!changeRequest.trim() || addRequest.isPending}
              onClick={() => {
                addRequest.mutate({
                  client_id: client.id,
                  title: "Expected plan change",
                  detail: changeRequest.trim(),
                  status: "open",
                });
                setChangeRequest("");
              }}
              className="mt-2"
            >
              Send change
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
