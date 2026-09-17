import { useMemo } from "react";
import { AlertCircle, Rocket, TimerReset } from "lucide-react";

import { PHASE_COLOURS, type PhaseRow } from "@/lib/bge";
import { formatDate, type DelayRow, type TaskRow } from "@/lib/journey";
import { useDelays, useTasks } from "@/lib/journey-queries";
import { cn } from "@/lib/utils";

const DAY = 86400000;

function toDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function span(dates: (Date | null)[]) {
  const valid = dates.filter((d): d is Date => Boolean(d));
  if (!valid.length) return null;
  const times = valid.map((d) => d.getTime());
  return { start: new Date(Math.min(...times)), end: new Date(Math.max(...times)) };
}

type PhaseLine = {
  phase: PhaseRow;
  expected: { start: Date; end: Date } | null;
  actual: { start: Date; end: Date } | null;
  daysSaved: number;
  clientDelay: number;
  teamDelay: number;
  done: number;
  total: number;
};

function buildLines(phases: PhaseRow[], tasks: TaskRow[], delays: DelayRow[]): PhaseLine[] {
  return phases.map((phase) => {
    const list = tasks.filter((task) => task.phase_id === phase.phase_id);
    const doneList = list.filter((task) => task.status === "done");
    const expected = span(list.map((task) => toDate(task.expected_date)));
    const actual = span(doneList.map((task) => toDate(task.actual_date)));
    const complete = list.length > 0 && doneList.length === list.length;
    const daysSaved =
      complete && expected && actual
        ? Math.round((expected.end.getTime() - actual.end.getTime()) / DAY)
        : 0;
    const forPhase = delays.filter((delay) => delay.phase_id === phase.phase_id);
    return {
      phase,
      expected,
      actual,
      daysSaved: daysSaved > 0 ? daysSaved : 0,
      clientDelay: forPhase
        .filter((delay) => delay.cause === "client")
        .reduce((sum, delay) => sum + (delay.days ?? 0), 0),
      teamDelay: forPhase
        .filter((delay) => delay.cause !== "client")
        .reduce((sum, delay) => sum + (delay.days ?? 0), 0),
      done: doneList.length,
      total: list.length,
    };
  });
}

/** One condensed line: time saved and days added, for the top of the page. */
export function TimelineSummary({
  client,
  phases,
  readOnly = false,
}: {
  client: { id: string };
  phases: PhaseRow[];
  readOnly?: boolean;
}) {
  const { data: tasks = [] } = useTasks(client.id);
  const { data: delays = [] } = useDelays(client.id);
  const lines = useMemo(() => buildLines(phases, tasks, delays), [phases, tasks, delays]);
  const saved = lines.reduce((sum, line) => sum + line.daysSaved, 0);
  const clientDelay = lines.reduce((sum, line) => sum + line.clientDelay, 0);
  const teamDelay = readOnly ? 0 : lines.reduce((sum, line) => sum + line.teamDelay, 0);

  if (!saved && !clientDelay && !teamDelay) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
      {saved > 0 && (
        <span className="flex items-center gap-1 rounded-full border border-success/50 bg-success/10 px-2 py-1 text-success">
          <Rocket className="size-3" /> {saved} days saved
        </span>
      )}
      {clientDelay > 0 && (
        <span className="flex items-center gap-1 rounded-full border border-warning/50 bg-warning/10 px-2 py-1 text-warning">
          <TimerReset className="size-3" /> +{clientDelay} days waiting on the client
        </span>
      )}
      {teamDelay > 0 && (
        <span className="flex items-center gap-1 rounded-full border border-destructive/50 bg-destructive/10 px-2 py-1 text-destructive">
          <AlertCircle className="size-3" /> +{teamDelay} days on us
        </span>
      )}
    </div>
  );
}

/**
 * Two timelines, one above the other: what we promised, and what actually
 * happened — with time saved and days added on top.
 */
export function DualTimeline({
  client,
  phases,
  readOnly = false,
}: {
  client: { id: string };
  phases: PhaseRow[];
  readOnly?: boolean;
}) {
  const { data: tasks = [] } = useTasks(client.id);
  const { data: delays = [] } = useDelays(client.id);

  const lines = useMemo(() => buildLines(phases, tasks, delays), [phases, tasks, delays]);

  const totalSaved = lines.reduce((sum, line) => sum + line.daysSaved, 0);
  const totalClientDelay = lines.reduce((sum, line) => sum + line.clientDelay, 0);
  const totalTeamDelay = lines.reduce((sum, line) => sum + line.teamDelay, 0);

  return (
    <section
      aria-label="Expected and actual timeline"
      className="border-b border-border bg-surface-deep px-5 py-5 lg:px-8"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Expected vs actual</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The top line is the plan. The line underneath is what really happened.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
          {totalSaved > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-success/50 bg-success/10 px-2 py-1 text-success">
              <Rocket className="size-3" /> {totalSaved} days saved
            </span>
          )}
          {totalClientDelay > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-warning/50 bg-warning/10 px-2 py-1 text-warning">
              <TimerReset className="size-3" /> +{totalClientDelay} days waiting on the client
            </span>
          )}
          {!readOnly && totalTeamDelay > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-destructive/50 bg-destructive/10 px-2 py-1 text-destructive">
              <AlertCircle className="size-3" /> +{totalTeamDelay} days on us
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {lines.map((line) => {
          const colour = PHASE_COLOURS[line.phase.phase_id] ?? "var(--primary)";
          const added = line.clientDelay + (readOnly ? 0 : line.teamDelay);
          const pct = line.total ? Math.round((line.done / line.total) * 100) : 0;
          return (
            <div
              key={line.phase.phase_id}
              className="rounded-xl border border-border bg-card/60 p-3 transition-shadow hover:shadow-lg"
              style={{ boxShadow: `inset 3px 0 0 0 ${colour}` }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-xs font-semibold">{line.phase.name}</p>
                <span className="num text-[10px] text-muted-foreground">{pct}%</span>
              </div>

              {/* expected */}
              <div className="mt-2.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  Expected
                </p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <span className="block h-full w-full" style={{ backgroundColor: colour }} />
                </div>
                <p className="num mt-1 text-[10px] text-muted-foreground">
                  {line.expected
                    ? `${formatDate(line.expected.start.toISOString())} → ${formatDate(line.expected.end.toISOString())}`
                    : "No dates yet"}
                </p>
              </div>

              {/* actual */}
              <div className="mt-2.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  Actual
                </p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <span
                    className={cn("block h-full rounded-full", pct === 100 && "ember-fill")}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: pct === 100 ? undefined : "var(--foreground)",
                      opacity: pct === 100 ? 1 : 0.55,
                    }}
                  />
                </div>
                <p className="num mt-1 text-[10px] text-muted-foreground">
                  {line.actual
                    ? `${formatDate(line.actual.start.toISOString())} → ${formatDate(line.actual.end.toISOString())}`
                    : "Not finished yet"}
                </p>
              </div>

              {(line.daysSaved > 0 || added > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
                  {line.daysSaved > 0 && (
                    <span className="rounded-full border border-success/50 bg-success/10 px-2 py-0.5 text-success">
                      −{line.daysSaved} days
                    </span>
                  )}
                  {added > 0 && (
                    <span className="rounded-full border border-warning/50 bg-warning/10 px-2 py-0.5 text-warning">
                      +{added} days
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
