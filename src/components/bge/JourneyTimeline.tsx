import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Columns2,
  Eye,
  EyeOff,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  Rocket,
  Rows3,
  Slash,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PHASE_COLOURS } from "@/lib/bge";
import {
  HEALTH,
  PRIORITIES,
  STATUSES,
  daysTo,
  effectivePriority,
  formatDate,
  priorityColour,
  statusMeta,
  type TaskRow,
} from "@/lib/journey";
import {
  STEPS_BY_PHASE,
  roadmapKind,
  stepsForPhase,
  buildPhaseSteps,
  reachedPhase,
  timedPhase,
  useSyncPhaseSteps,
} from "@/lib/journey-steps";
import { StepCard } from "@/components/bge/StepCard";
import { useTaskMutations, useTasks } from "@/lib/journey-queries";
import { phaseStepDates, phaseWindow, useSeedStandardTasks } from "@/lib/task-templates";

import { logAudit, useUpdateClient } from "@/lib/queries";

type TimelineClient = {
  id: string;
  name: string;
  phase: number;
  program?: string | null;
  roadmap_program?: string | null;
  journey_start?: string | null;
  joined_date?: string | null;
  renewal?: string | null;
  extension_days?: number | null;
  vsl_writer?: string | null;
  health?: string | null;
  launched?: boolean | null;

  content_plan?: boolean | null;
};
type TimelinePhase = { phase_id: number; label: string; name: string };
type Lane = "client" | "team";

const PHASE_OUTCOMES: Record<number, string> = {
  1: "Complete the business inputs, prepare the copy and approve the scripts.",
  2: "Record the content, add the assets and build the complete funnel.",
  3: "Set up the ads account and sales process so everything is ready to launch.",
  4: "Launch the ads, receive enquiries and begin taking sales calls.",
  5: "Review ads, sales calls and funnel performance, then improve what is live.",
  6: "Scale the proven parts of the acquisition and sales system.",
};

const WORKBOOK_PHASE_NAMES: Record<number, string> = {
  1: "Onboarding",
  2: "Funnel Build",
  3: "Pre-Launch",
  4: "Launch",
  5: "Optimisation",
  6: "Scaling",
};

/** Phase labels sometimes include the name; the small line only needs the week range. */
function weekRange(label: string) {
  return label.match(/weeks?\s*\d+(?:\s*[–-]\s*\d+)?/i)?.[0] ?? label;
}

/** tick · neutral · not done yet */
function statusGlyph(status: string) {
  if (status === "done") return { icon: Check, tone: "done" as const, label: "Done" };
  if (status === "to_come") return { icon: Slash, tone: "todo" as const, label: "Not started" };
  return { icon: Minus, tone: "mid" as const, label: statusMeta(status).label };
}

function nextStatus(status: string) {
  if (status === "done") return "to_come";
  if (status === "to_come") return "in_progress";
  return "done";
}

/** Shift an ISO date by whole days. */
function shiftIso(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * The stage's own window — start day through the day before the next stage
 * begins, so weeks 1–2 reads as start → start + 13 days.
 */
function phaseRange(client: Parameters<typeof phaseWindow>[0], phaseId: number) {
  const window = phaseWindow(client, phaseId);
  if (!window.fromIso || !window.toIso) return null;
  const last = shiftIso(window.toIso, -1);
  return `${formatDate(window.fromIso)} → ${formatDate(last)}`;
}

function TaskCard({
  task,
  clientName,
  readOnly,
  colour,
}: {
  task: TaskRow;
  clientName: string;
  readOnly: boolean;
  colour: string;
}) {
  const [open, setOpen] = useState(false);
  const { update, remove } = useTaskMutations();
  const meta = statusMeta(task.status);
  const glyph = statusGlyph(task.status);
  const Glyph = glyph.icon;
  const late =
    task.status !== "done" && (daysTo(task.expected_date) ?? 1) < 0 && task.expected_date;
  const countdown = daysTo(task.expected_date);
  const shown = effectivePriority(task);
  const patch = (next: Parameters<typeof update.mutate>[0]["patch"]) =>
    update.mutate({ id: task.id, patch: next });

  return (
    <div className="group/task relative">
      {/* thin arrow dropping from the journey line */}
      <span
        aria-hidden
        className="mx-auto block h-4 w-px bg-border-strong transition-colors group-hover/task:bg-primary"
      />
      <div
        onMouseEnter={(event) => {
          event.currentTarget.style.boxShadow = `0 0 0 1px color-mix(in oklab, ${colour} 55%, transparent), 0 12px 34px -12px color-mix(in oklab, ${colour} 70%, transparent)`;
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.boxShadow = "";
        }}
        className={cn(
          "rounded-xl border bg-card/95 backdrop-blur-sm transition-all duration-300",
          "border-border hover:-translate-y-0.5 hover:border-primary/60",
          open && "border-primary/70 shadow-ember",
          late && "border-destructive/60",
        )}
      >
        <div className="flex items-start gap-2 p-3">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block truncate text-sm font-medium">{task.title}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              <span>{task.owner === "Client" ? "Client task" : "Our task"}</span>
              {late && (
                <span className="rounded bg-destructive/15 px-1 py-0 text-[9px] font-bold text-destructive">
                  Late
                </span>
              )}

              {task.status !== "done" && (
                <span
                  className="rounded px-1 py-0 text-[9px] font-bold"
                  style={{
                    color: priorityColour(shown.priority),
                    backgroundColor: `color-mix(in oklab, ${priorityColour(shown.priority)} 15%, transparent)`,
                  }}
                >
                  {shown.priority}
                  {shown.escalated ? " ↑" : ""}
                </span>
              )}
              {task.status === "done" && task.actual_date && (
                <span className="text-success">Done {formatDate(task.actual_date)}</span>
              )}
            </span>
          </button>
          <button
            type="button"
            disabled={readOnly}
            title={glyph.label}
            aria-label={`${task.title}: ${glyph.label}`}
            onClick={() => {
              const status = nextStatus(task.status);
              patch({
                status,
                actual_date:
                  status === "done"
                    ? (task.actual_date ?? new Date().toISOString().slice(0, 10))
                    : null,
              });
              void logAudit(
                "task_status",
                clientName,
                `${task.title} → ${statusMeta(status).label}`,
              );
            }}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border transition-all",
              glyph.tone === "done" && "border-success bg-success text-background",
              glyph.tone === "mid" && "border-warning text-warning",
              glyph.tone === "todo" && "border-border text-muted-foreground",
              !readOnly && "hover:scale-110",
            )}
          >
            <Glyph className="size-3" />
          </button>
        </div>

        {open && (
          <div className="animate-accordion-down border-t border-border px-3 py-3">
            {readOnly ? (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p style={{ color: meta.colour }}>{meta.label}</p>
                <p>{task.detail || task.status_note || "No further action is needed right now."}</p>
                {task.owner && <p>Owned by {task.owner}</p>}
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">
                    Status
                    <select
                      value={task.status}
                      onChange={(event) => {
                        patch({
                          status: event.target.value,
                          actual_date:
                            event.target.value === "done"
                              ? (task.actual_date ?? new Date().toISOString().slice(0, 10))
                              : task.actual_date,
                        });
                        void logAudit(
                          "task_status",
                          clientName,
                          `${task.title} → ${statusMeta(event.target.value).label}`,
                        );
                      }}
                      className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-normal normal-case text-foreground"
                    >
                      {STATUSES.map((status) => (
                        <option key={status.key} value={status.key}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">
                    Priority
                    <select
                      value={task.priority}
                      onChange={(event) => patch({ priority: event.target.value })}
                      className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-normal normal-case text-foreground"
                    >
                      {PRIORITIES.map((priority) => (
                        <option key={priority}>{priority}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">
                    Expected
                    <Input
                      type="date"
                      value={task.expected_date ?? ""}
                      onChange={(event) => patch({ expected_date: event.target.value || null })}
                      className="mt-1 h-8 bg-background text-xs"
                    />
                  </label>
                </div>
                <label className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Detail
                  <Textarea
                    defaultValue={task.detail ?? ""}
                    onBlur={(event) => patch({ detail: event.target.value || null })}
                    className="mt-1 min-h-16 bg-background text-xs font-normal normal-case"
                  />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={task.client_visible}
                      onChange={(event) => patch({ client_visible: event.target.checked })}
                      className="accent-primary"
                    />
                    {task.client_visible ? (
                      <Eye className="size-3.5" />
                    ) : (
                      <EyeOff className="size-3.5" />
                    )}
                    Visible to the client
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      if (window.confirm(`Remove “${task.title}”?`)) remove.mutate(task.id);
                    }}
                  >
                    <Trash2 className="size-3.5" /> Remove
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AddTask({
  clientId,
  phaseId,
  lane,
  count,
}: {
  clientId: string;
  phaseId: number;
  lane: Lane;
  count: number;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const { add } = useTaskMutations();
  const submit = () => {
    if (!title.trim()) return;
    add.mutate({
      client_id: clientId,
      phase_id: phaseId,
      title: title.trim(),
      owner: lane === "client" ? "Client" : null,
      client_visible: lane === "client",
      sort_order: count,
    });
    setTitle("");
    setAdding(false);
  };

  if (!adding) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="mt-1 h-7 px-0 text-[11px] text-muted-foreground hover:bg-transparent hover:text-primary"
        onClick={() => setAdding(true)}
      >
        <Plus className="size-3" /> {lane === "client" ? "Client task" : "Our task"}
      </Button>
    );
  }

  return (
    <div className="mt-2 flex gap-2">
      <Input
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && submit()}
        placeholder={lane === "client" ? "Client task" : "Our task"}
        className="h-8 bg-background text-xs"
      />
      <Button type="button" size="sm" onClick={submit}>
        Add
      </Button>
    </div>
  );
}

/**
 * Two thin lines side by side for the stage that is open: what we planned, and
 * how it is actually going.
 */
export function JourneyTimeline({
  client,
  phases,
  readOnly = false,
  teamWorkspace = false,
  viewAsClient = false,
  onToggleClientView,
}: {
  client: TimelineClient;
  phases: TimelinePhase[];
  readOnly?: boolean;
  teamWorkspace?: boolean;
  viewAsClient?: boolean;
  onToggleClientView?: () => void;
}) {
  const { data: tasks = [], isLoading } = useTasks(client.id);
  const seed = useSeedStandardTasks();
  const syncSteps = useSyncPhaseSteps();
  const updateClient = useUpdateClient();
  const [selectedPhase, setSelectedPhase] = useState(client.phase);
  const [hovered, setHovered] = useState<number | null>(null);
  const [layout, setLayout] = useState<"linear" | "split">(() => {
    if (typeof window === "undefined") return "split";
    return window.localStorage.getItem("bge-phase-view") === "linear" ? "linear" : "split";
  });

  const setView = (next: "linear" | "split") => {
    setLayout(next);
    if (typeof window !== "undefined") window.localStorage.setItem("bge-phase-view", next);
  };

  // whiteboard panning and zooming
  const viewport = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const offsetRef = useRef(offset);
  const zoomRef = useRef(zoom);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{
    distance: number;
    zoom: number;
    worldX: number;
    worldY: number;
  } | null>(null);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => setSelectedPhase(client.phase), [client.phase]);

  useEffect(() => {
    if (readOnly || isLoading || !tasks.length || syncSteps.isPending) return;
    const have = new Set(tasks.filter((task) => task.step_key).map((task) => task.step_key));
    const kind = roadmapKind(client);
    const wanted = Object.keys(STEPS_BY_PHASE)
      .map(Number)
      .flatMap((phaseId) => stepsForPhase(phaseId, kind))
      .filter((step) => !step.contentPlanOnly || Boolean(client.content_plan));
    const wantedKeys = new Set(wanted.map((step) => step.key));
    const missing = wanted.some((step) => !have.has(step.key));
    const stale = [...have].some((key) => key && !wantedKeys.has(key));

    // The journey start date drives every expected date. If it moves, every
    // step that nobody has pinned by hand moves with it.
    const dates = phaseStepDates(client);
    const drifted = Object.keys(STEPS_BY_PHASE)
      .map(Number)
      .flatMap((phaseId) => buildPhaseSteps(client, phaseId, dates(phaseId)))
      .some((row) => {
        const current = tasks.find((task) => task.step_key === row.step_key);
        if (!current || current.date_locked) return false;
        return current.expected_date !== ((row.expected_date as string | null) ?? null);
      });

    if (!missing && !stale && !drifted) return;
    syncSteps.mutate({ client, existing: tasks, dates });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    readOnly,
    isLoading,
    tasks,
    client.content_plan,
    client.program,
    client.journey_start,
    client.joined_date,
    client.extension_days,
  ]);

  /** Scroll up zooms in, scroll down zooms out, anchored beneath the pointer. */
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const handler = (event: WheelEvent) => {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        const nextOffset = {
          ...offsetRef.current,
          x: offsetRef.current.x - event.deltaX * unit,
        };
        offsetRef.current = nextOffset;
        setOffset(nextOffset);
        return;
      }

      const currentZoom = zoomRef.current;
      const delta = event.deltaY * unit;
      const nextZoom = Math.min(2, Math.max(0.4, currentZoom * Math.exp(-delta * 0.0015)));
      if (nextZoom === currentZoom) return;

      const rect = element.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const scale = nextZoom / currentZoom;
      const currentOffset = offsetRef.current;
      const nextOffset = {
        x: pointerX - (pointerX - currentOffset.x) * scale,
        y: pointerY - (pointerY - currentOffset.y) * scale,
      };

      zoomRef.current = nextZoom;
      offsetRef.current = nextOffset;
      setZoom(nextZoom);
      setOffset(nextOffset);
    };
    element.addEventListener("wheel", handler, { passive: false });
    return () => element.removeEventListener("wheel", handler);
  }, [isLoading]);

  const reset = () => {
    const resetOffset = { x: 0, y: 0 };
    offsetRef.current = resetOffset;
    zoomRef.current = 1;
    setOffset(resetOffset);
    setZoom(1);
  };

  const zoomBy = (factor: number) => {
    const element = viewport.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const currentZoom = zoomRef.current;
    const nextZoom = Math.min(2, Math.max(0.4, currentZoom * factor));
    const pointerX = rect.width / 2;
    const pointerY = rect.height / 2;
    const currentOffset = offsetRef.current;
    const scale = nextZoom / currentZoom;
    const nextOffset = {
      x: pointerX - (pointerX - currentOffset.x) * scale,
      y: pointerY - (pointerY - currentOffset.y) * scale,
    };
    zoomRef.current = nextZoom;
    offsetRef.current = nextOffset;
    setZoom(nextZoom);
    setOffset(nextOffset);
  };

  const byPhase = useMemo(() => {
    const grouped = new Map<number, TaskRow[]>();
    for (const task of tasks) {
      grouped.set(task.phase_id, [...(grouped.get(task.phase_id) ?? []), task]);
    }
    return grouped;
  }, [tasks]);

  /** Stages the client can work in: their stage, finished ones, and — after
   * launch — Optimisation and Scaling, which arrive on their own with time. */
  const reached = useMemo(
    () => timedPhase(reachedPhase(client.phase, tasks), tasks),
    [client.phase, tasks],
  );

  const startDate = client.journey_start ?? client.joined_date ?? null;
  /** Launch is the end of the Launch stage, six weeks in plus any added days. */
  const expectedLaunch = phaseWindow(client, 4).toIso;

  /** The end of the stage they are on, for the countdown. */
  const phaseEnd = phaseWindow(client, client.phase).toIso;
  const daysLeft = phaseEnd ? daysTo(phaseEnd) : null;

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center gap-2 border-y border-border bg-surface-deep text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" /> Opening the whiteboard…
      </div>
    );
  }

  return (
    <section aria-label="Client journey roadmap" className="relative bg-card pt-3">
      <header className="relative z-20 mx-auto w-[94%] rounded-t-xl border border-b-0 border-border bg-card px-3 py-2 shadow-pop lg:w-[82%] lg:px-4">
        {teamWorkspace && (
          <div className="absolute -top-6 right-4 flex h-6 items-center rounded-t-md border border-b-0 border-border bg-card px-2.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            {viewAsClient ? "Viewing as client" : "BGE team member"}
          </div>
        )}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex min-w-0 shrink-0 items-center gap-2 lg:w-[265px]">
            {teamWorkspace && (
              <Button asChild variant="ghost" size="icon" className="size-8 shrink-0">
                <Link to="/clients" aria-label="Back to clients">
                  <ArrowLeft className="size-3.5" />
                </Link>
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold">{client.name}</h1>
              <p className="truncate text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                Client journey · {phases.find((item) => item.phase_id === client.phase)?.label}
                {client.program ? ` · ${client.program}` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {teamWorkspace && !viewAsClient && startDate && (
              <span className="num rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                Started {formatDate(startDate)}
              </span>
            )}
            {typeof daysLeft === "number" && (
              <span
                className={cn(
                  "num rounded-md border px-2 py-1 text-[10px] font-semibold",
                  daysLeft < 0
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "border-border text-muted-foreground",
                )}
              >
                {daysLeft < 0
                  ? `${Math.abs(daysLeft)} days over on this phase`
                  : `${daysLeft} days left in this phase`}
              </span>
            )}
            {teamWorkspace && !viewAsClient && (
              <select
                value={client.health ?? "green"}
                onChange={(event) =>
                  updateClient.mutate({
                    id: client.id,
                    patch: { health: event.target.value } as never,
                  })
                }
                aria-label="Client health"
                className={cn(
                  "h-7 rounded-md border bg-card px-1.5 text-[10px] font-bold uppercase tracking-wide",
                  client.health === "red"
                    ? "border-destructive/60 text-destructive"
                    : client.health === "amber"
                      ? "border-warning/60 text-warning"
                      : "border-success/60 text-success",
                )}
              >
                {HEALTH.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-nowrap gap-1 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
            {phases.map((phase) => {
              const colour = PHASE_COLOURS[phase.phase_id] ?? "var(--primary)";
              const active = phase.phase_id === selectedPhase;
              const list = byPhase.get(phase.phase_id) ?? [];
              const lateCount = list.filter(
                (task) =>
                  task.status !== "done" &&
                  task.expected_date &&
                  (daysTo(task.expected_date) ?? 1) < 0,
              ).length;
              return (
                <button
                  key={phase.phase_id}
                  type="button"
                  onMouseEnter={() => setHovered(phase.phase_id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelectedPhase(phase.phase_id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all duration-300",
                    active
                      ? "border-transparent text-background"
                      : "border-border text-muted-foreground hover:-translate-y-0.5 hover:text-foreground",
                  )}
                  style={
                    active
                      ? {
                          backgroundColor: colour,
                          boxShadow: `0 0 22px -4px color-mix(in oklab, ${colour} 75%, transparent)`,
                        }
                      : hovered === phase.phase_id
                        ? {
                            borderColor: colour,
                            boxShadow: `0 0 18px -6px color-mix(in oklab, ${colour} 70%, transparent)`,
                          }
                        : undefined
                  }
                >
                  Phase {phase.phase_id}
                  {lateCount > 0 && (
                    <span className="flex items-center gap-0.5 rounded-full border border-destructive/50 bg-destructive/10 px-1.5 py-0 text-[9px] font-bold text-destructive">
                      <AlertCircle className="size-2.5" /> {lateCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {teamWorkspace && onToggleClientView && (
              <Button
                type="button"
                size="sm"
                variant={viewAsClient ? "default" : "ghost"}
                onClick={onToggleClientView}
                className={cn("h-8", viewAsClient && "ember-fill shadow-ember")}
              >
                <Eye className="mr-1 size-3.5" />
                {viewAsClient ? "Team view" : "Client view"}
              </Button>
            )}
            {!readOnly && !tasks.length && (
              <Button
                type="button"
                size="sm"
                disabled={seed.isPending}
                onClick={() => seed.mutate(client)}
              >
                {seed.isPending ? "Loading…" : "Load standard checklist"}
              </Button>
            )}
            {teamWorkspace && !viewAsClient && (
              <button
                type="button"
                onClick={() =>
                  updateClient.mutate({
                    id: client.id,
                    patch: {
                      launched: !client.launched,
                      launched_date: !client.launched
                        ? new Date().toISOString().slice(0, 10)
                        : null,
                    } as never,
                  })
                }
                title="Whether the funnel and ads are live"
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[10px] font-bold uppercase tracking-wide transition-colors",
                  client.launched
                    ? "border-success/60 bg-success/15 text-success"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                )}
              >
                <Rocket className="size-3.5" />
                {client.launched ? "Launched" : "Not launched yet"}
              </button>
            )}
            {viewAsClient && client.launched && (
              <span className="flex h-8 items-center gap-1.5 rounded-md border border-success/60 bg-success/15 px-2.5 text-[10px] font-bold uppercase tracking-wide text-success">
                <Rocket className="size-3.5" /> Launched
              </span>
            )}
            <div className="flex items-center rounded-lg border border-border">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-r-none"
                onClick={() => zoomBy(0.82)}
                aria-label="Zoom out"
              >
                <Minus className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-none border-x border-border"
                onClick={reset}
                aria-label="Recentre the board"
                title="Recentre the board"
              >
                <Maximize2 className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-l-none"
                onClick={() => zoomBy(1.22)}
                aria-label="Zoom in"
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div
        ref={viewport}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button,input,select,textarea,a")) return;
          // Stop the browser from selecting text on the board while dragging.
          event.preventDefault();
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          const points = [...pointers.current.values()];
          if (points.length === 2) {
            const [first, second] = points;
            if (!first || !second) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const middleX = (first.x + second.x) / 2 - rect.left;
            const middleY = (first.y + second.y) / 2 - rect.top;
            const distance = Math.hypot(second.x - first.x, second.y - first.y);
            pinch.current = {
              distance,
              zoom: zoomRef.current,
              worldX: (middleX - offsetRef.current.x) / zoomRef.current,
              worldY: (middleY - offsetRef.current.y) / zoomRef.current,
            };
            drag.current = null;
          } else {
            drag.current = {
              x: event.clientX,
              y: event.clientY,
              ox: offsetRef.current.x,
              oy: offsetRef.current.y,
            };
          }
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (pointers.current.has(event.pointerId)) {
            pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          }
          const points = [...pointers.current.values()];
          if (points.length === 2 && pinch.current) {
            const [first, second] = points;
            if (!first || !second) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const middleX = (first.x + second.x) / 2 - rect.left;
            const middleY = (first.y + second.y) / 2 - rect.top;
            const distance = Math.hypot(second.x - first.x, second.y - first.y);
            const nextZoom = Math.min(
              2,
              Math.max(0.4, pinch.current.zoom * (distance / Math.max(pinch.current.distance, 1))),
            );
            const nextOffset = {
              x: middleX - pinch.current.worldX * nextZoom,
              y: middleY - pinch.current.worldY * nextZoom,
            };
            zoomRef.current = nextZoom;
            offsetRef.current = nextOffset;
            setZoom(nextZoom);
            setOffset(nextOffset);
            return;
          }
          if (!drag.current) return;
          const nextOffset = {
            x: drag.current.ox + (event.clientX - drag.current.x),
            y: drag.current.oy + (event.clientY - drag.current.y),
          };
          offsetRef.current = nextOffset;
          setOffset(nextOffset);
        }}
        onPointerUp={(event) => {
          pointers.current.delete(event.pointerId);
          pinch.current = null;
          const remaining = [...pointers.current.values()][0];
          drag.current = remaining
            ? {
                x: remaining.x,
                y: remaining.y,
                ox: offsetRef.current.x,
                oy: offsetRef.current.y,
              }
            : null;
        }}
        onPointerCancel={(event) => {
          pointers.current.delete(event.pointerId);
          pinch.current = null;
          drag.current = null;
        }}
        className="whiteboard-canvas relative h-[calc(100dvh-13rem)] min-h-[460px] cursor-grab select-none overflow-hidden border-t border-border bg-card active:cursor-grabbing lg:h-[calc(100vh-6.75rem)] lg:min-h-[560px]"

        style={{
          touchAction: "none",
          backgroundPosition: `${offset.x}px ${offset.y}px`,
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left px-6 pb-20 pt-14 lg:px-10"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
        >
          <div className="relative flex w-[1900px] items-start gap-5">
            {/* the journey line */}
            <span
              aria-hidden
              className="ember-rule pointer-events-none absolute left-0 right-0 top-[86px] h-px opacity-70"
            />
            {phases.map((phase) => {
              const list = byPhase.get(phase.phase_id) ?? [];
              const done = list.filter((task) => task.status === "done").length;
              const complete =
                phase.phase_id < client.phase || (list.length > 0 && done === list.length);
              const live = phase.phase_id === client.phase;
              const locked = phase.phase_id === selectedPhase;
              const glowing = hovered === phase.phase_id;
              const near = Math.abs(phase.phase_id - selectedPhase) === 1;
              const colour = PHASE_COLOURS[phase.phase_id] ?? "var(--primary)";
              const clientTasks = list.filter((task) => task.owner === "Client");
              const teamTasks = list.filter((task) => task.owner !== "Client");
              const range = phaseRange(client, phase.phase_id);
              const lateCount = list.filter(
                (task) =>
                  task.status !== "done" &&
                  task.expected_date &&
                  (daysTo(task.expected_date) ?? 1) < 0,
              ).length;

              // For clients, stages they have not reached yet stay fully readable —
              // they can open them and look ahead, but nothing can be filled in.
              const sealed = readOnly && phase.phase_id > reached;

              return (
                <div
                  key={phase.phase_id}
                  onMouseEnter={() => setHovered(phase.phase_id)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(
                    "whiteboard-phase relative min-w-0 overflow-hidden rounded-xl border p-4 transition-all duration-500 ease-out",
                    locked ? "flex-[12]" : near ? "flex-[2]" : "flex-[1]",
                    locked ? "border-primary bg-card" : "border-transparent",
                    sealed && "opacity-75",
                  )}
                  style={
                    glowing || locked
                      ? {
                          boxShadow: `0 0 0 1px color-mix(in oklab, ${colour} ${locked ? 45 : 30}%, transparent), 0 18px 60px -24px color-mix(in oklab, ${colour} ${locked ? 85 : 55}%, transparent)`,
                          backgroundColor: "var(--card)",
                        }
                      : undefined
                  }
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPhase(phase.phase_id);
                      setOffset({ x: 0, y: 0 });
                    }}

                    className="w-full text-left"
                    aria-pressed={locked}
                  >
                    <span
                      className="block truncate text-[10px] font-bold uppercase tracking-widest transition-colors"
                      style={{ color: locked || glowing ? colour : "var(--muted-foreground)" }}
                    >
                      {weekRange(phase.label)}
                    </span>
                    <span
                      className={cn(
                        "mt-1 block truncate font-semibold transition-all duration-500",
                        locked ? "text-xl" : near ? "text-sm" : "text-xs opacity-70",
                      )}
                    >
                      Phase {phase.phase_id} {WORKBOOK_PHASE_NAMES[phase.phase_id] ?? phase.name}
                    </span>
                    <span className="num mt-0.5 block truncate text-[10px] text-muted-foreground">
                      {range ?? "No dates yet"}
                    </span>
                    <span className="relative mt-3 flex h-7 items-center">
                      <span
                        className={cn(
                          "flex items-center justify-center rounded-full border bg-surface-deep transition-all duration-500",
                          locked ? "size-7" : "size-5",
                          complete && "border-success bg-success text-background",
                          !complete && "border-border-strong",
                        )}
                        style={
                          !complete && (live || locked || glowing)
                            ? {
                                borderColor: colour,
                                boxShadow: `0 0 18px -2px color-mix(in oklab, ${colour} 80%, transparent)`,
                              }
                            : undefined
                        }
                      >
                        {complete ? (
                          <Check className={locked ? "size-3.5" : "size-2.5"} />
                        ) : (
                          <span
                            className="block size-2 rounded-full"
                            style={{ backgroundColor: live || locked ? colour : "transparent" }}
                          />
                        )}
                      </span>
                      {live && (
                        <span
                          aria-hidden
                          className="pulse pointer-events-none absolute left-0 top-0 size-7 rounded-full"
                          style={{
                            boxShadow: `0 0 0 7px color-mix(in oklab, ${colour} 20%, transparent)`,
                          }}
                        />
                      )}
                    </span>
                  </button>

                  <div className="mt-3">
                    {locked ? (
                      (() => {
                        const steps = list
                          .filter((task) => task.step_key)
                          .sort((a, b) => a.gate_order - b.gate_order);
                        const extras = list.filter((task) => !task.step_key);
                        const isClientSide = (task: TaskRow) =>
                          (task.owner ?? "").includes("Client");
                        const renderOne = (task: TaskRow) =>
                          task.step_key ? (
                            <div key={task.id} className="mb-2">
                              <StepCard
                                task={task}
                                tasks={list}
                                client={client}
                                readOnly={readOnly}
                                colour={colour}
                                forceLocked={sealed}
                              />
                            </div>
                          ) : (
                            <TaskCard
                              key={task.id}
                              task={task}
                              clientName={client.name}
                              readOnly={readOnly}
                              colour={colour}
                            />
                          );

                        return (
                          <div className="animate-fade-in space-y-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <p className="max-w-xl text-xs text-muted-foreground">
                                {PHASE_OUTCOMES[phase.phase_id] ??
                                  "Complete the work in this stage before moving forward."}
                              </p>
                              <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                                {(
                                  [
                                    { key: "linear", label: "Linear", icon: Rows3 },
                                    { key: "split", label: "Split", icon: Columns2 },
                                  ] as const
                                ).map(({ key, label, icon: Icon }) => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => setView(key)}
                                    aria-pressed={layout === key}
                                    className={cn(
                                      "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors",
                                      layout === key
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground",
                                    )}
                                  >
                                    <Icon className="size-3" /> {label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {sealed && (
                              <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                                This stage is coming up later. Have a read of what is involved — you
                                will be able to fill it in once you reach it.
                              </p>
                            )}
                            <div className="flex flex-wrap items-start gap-4">
                              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
                                <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                                  {done}/{list.length} complete
                                </span>
                                <span className="num rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                                  {range ?? "No dates yet"}
                                </span>
                                {lateCount > 0 && (
                                  <span className="rounded-full border border-destructive/50 px-2 py-0.5 text-destructive">
                                    {lateCount} delayed
                                  </span>
                                )}
                              </div>
                            </div>

                            {layout === "linear" ? (
                              <div>
                                {[...steps, ...extras].map(renderOne)}
                                {!list.length && (
                                  <p className="py-2 text-xs text-muted-foreground">
                                    Nothing in this stage yet.
                                  </p>
                                )}
                                {!readOnly && (
                                  <AddTask
                                    clientId={client.id}
                                    phaseId={phase.phase_id}
                                    lane="team"
                                    count={list.length}
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    <UserRound className="size-3" /> Client
                                  </p>
                                  {[...steps, ...extras].filter(isClientSide).map(renderOne)}
                                  {![...steps, ...extras].some(isClientSide) && (
                                    <p className="py-2 text-xs text-muted-foreground">
                                      Nothing needed from the client here.
                                    </p>
                                  )}
                                  {!readOnly && (
                                    <AddTask
                                      clientId={client.id}
                                      phaseId={phase.phase_id}
                                      lane="client"
                                      count={list.length}
                                    />
                                  )}
                                </div>
                                <div>
                                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    <UsersRound className="size-3" /> BGE team
                                  </p>
                                  {[...steps, ...extras]
                                    .filter((task) => !isClientSide(task))
                                    .map(renderOne)}
                                  {![...steps, ...extras].some((task) => !isClientSide(task)) && (
                                    <p className="py-2 text-xs text-muted-foreground">
                                      No work logged here yet.
                                    </p>
                                  )}
                                  {!readOnly && (
                                    <AddTask
                                      clientId={client.id}
                                      phaseId={phase.phase_id}
                                      lane="team"
                                      count={list.length}
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                            {phase.phase_id < 6 &&
                              list.length > 0 &&
                              list.every((task) => task.status === "done") && (
                                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3">
                                  <div>
                                    <p className="text-sm font-semibold">
                                      Move on to Phase {phase.phase_id + 1}?
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      All work in this phase is complete.
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    {client.phase <= phase.phase_id && (
                                      <Button type="button" size="sm" variant="outline" disabled>
                                        Not yet
                                      </Button>
                                    )}
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={client.phase > phase.phase_id}
                                      onClick={() =>
                                        updateClient.mutate({
                                          id: client.id,
                                          patch: { phase: phase.phase_id + 1 } as never,
                                        })
                                      }
                                    >
                                      Done
                                    </Button>
                                  </div>
                                </div>
                              )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="space-y-1 opacity-70 transition-opacity duration-500 hover:opacity-100">
                        {list.slice(0, 6).map((task) => (
                          <span
                            key={task.id}
                            title={`${task.title}${task.expected_date ? ` · ${formatDate(task.expected_date)}` : ""}`}
                            className={cn(
                              "block h-1.5 rounded-full",
                              task.status === "done"
                                ? "bg-success"
                                : task.status === "to_come"
                                  ? "bg-border-strong"
                                  : "bg-warning",
                            )}
                          />
                        ))}
                        <span className="num block pt-1 text-[10px] text-muted-foreground">
                          {done}/{list.length}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="pointer-events-none absolute bottom-3 right-4 hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:block">
          Scroll, pinch or drag to move around · click a phase to open it
        </p>
      </div>
    </section>
  );
}
