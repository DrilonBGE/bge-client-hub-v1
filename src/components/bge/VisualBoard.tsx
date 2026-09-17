import { useState } from "react";
import { ArrowLeft, Check, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  PHASE_COLOURS,
  overallProgress,
  phaseProgress,
  phasesComplete,
  taskKey,
  type Client,
  type Evidence,
  type PhaseRow,
} from "@/lib/bge";
import { ProgramBadge } from "@/components/bge/atoms";

function Donut({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg width="70" height="70" viewBox="0 0 70 70">
      <circle cx="35" cy="35" r={r} fill="none" stroke="var(--cream-dark)" strokeWidth="7" />
      <circle
        cx="35"
        cy="35"
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        transform="rotate(-90 35 35)"
      />
      <text
        x="35"
        y="39"
        textAnchor="middle"
        className="num"
        fontSize="14"
        fontWeight="700"
        fill="var(--foreground)"
      >
        {pct}%
      </text>
    </svg>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="num text-lg font-bold">{value}</p>
    </div>
  );
}

export function VisualBoard({
  client,
  phases,
  onBack,
  onToggleTask,
}: {
  client: Client;
  phases: PhaseRow[];
  onBack: () => void;
  onToggleTask: (phase: number, index: number, next: boolean) => void;
}) {
  const [openPhase, setOpenPhase] = useState<number | null>(client.phase);
  const [panel, setPanel] = useState<"overview" | "docs" | "calls" | "results">("overview");
  const overall = overallProgress(client, phases);
  const complete = phasesComplete(client, phases);
  const activePhase = phases.find((p) => p.phase_id === openPhase);
  const currentPhase = phases.find((p) => p.phase_id === client.phase);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-cream">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
        >
          <ArrowLeft className="size-3.5" /> Back
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{client.name}</p>
          <p className="text-[11px] text-muted-foreground">Visual Journey Board</p>
        </div>
        {currentPhase && (
          <span
            className="rounded-md px-2 py-1 text-[11px] font-semibold text-primary-foreground"
            style={{ backgroundColor: PHASE_COLOURS[currentPhase.phase_id] }}
          >
            {currentPhase.label}: {currentPhase.name}
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4 lg:flex-row">
        <div className="w-full shrink-0 space-y-3 lg:w-[260px]">
          <div className="flex gap-1 rounded-lg border border-border bg-card p-1 text-[11px]">
            {(
              [
                ["overview", "Overview"],
                ["docs", "Docs"],
                ["calls", "Calls"],
                ["results", "Results"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPanel(key)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 font-medium transition-colors",
                  panel === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {panel === "overview" && (
            <>
              <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                <p className="text-sm font-semibold">{client.name}</p>
                <ProgramBadge program={client.program} />
                <dl className="space-y-1 text-[12px]">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Value</dt>
                    <dd className="num font-semibold">{client.active ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Renewal</dt>
                    <dd>{client.renewal ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Leaving</dt>
                    <dd>{client.leaving ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Niche</dt>
                    <dd>{client.niche ?? "—"}</dd>
                  </div>
                </dl>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SummaryCard label="Tasks done" value={`${overall.done}/${overall.total}`} />
                <SummaryCard label="Phases complete" value={`${complete}/${phases.length}`} />
              </div>
            </>
          )}

          {panel === "docs" && (
            <div className="space-y-2 rounded-lg border border-border bg-card p-3">
              {client.docs.length === 0 && (
                <p className="text-xs text-muted-foreground">No documents yet.</p>
              )}
              {client.docs.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-accent"
                >
                  <span className="truncate">{doc.name}</span>
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}

          {panel === "calls" && (
            <div className="space-y-2 rounded-lg border border-border bg-card p-3">
              {client.call_reviews.length === 0 && (
                <p className="text-xs text-muted-foreground">No calls logged yet.</p>
              )}
              {client.call_reviews.map((call) => (
                <div key={call.id} className="rounded-md border border-border px-2 py-1.5 text-xs">
                  <p className="font-semibold">{call.type}</p>
                  <p className="text-muted-foreground">
                    {call.date} · {call.who}
                  </p>
                </div>
              ))}
            </div>
          )}

          {panel === "results" && (
            <div className="space-y-1 rounded-lg border border-border bg-card p-3 text-xs">
              {Object.entries(client.results)
                .filter(([key, value]) => key !== "evidence" && typeof value === "string" && value)
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{key.replace(/_/g, " ")}</span>
                    <span className="num font-semibold">{String(value)}</span>
                  </div>
                ))}
              {Object.keys(client.results).length === 0 && (
                <p className="text-muted-foreground">No results logged yet.</p>
              )}
              {((client.results["evidence"] as Evidence[] | undefined) ?? []).map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-primary hover:underline"
                >
                  {item.name}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="w-full shrink-0 lg:w-[210px]">
              {phases.map((phase, idx) => {
                const p = phaseProgress(client, phase);
                const status =
                  p.total > 0 && p.done === p.total
                    ? "Complete"
                    : phase.phase_id === client.phase
                      ? "Active"
                      : "Upcoming";
                return (
                  <div key={phase.phase_id}>
                    <button
                      onClick={() =>
                        setOpenPhase(phase.phase_id === openPhase ? null : phase.phase_id)
                      }
                      className={cn(
                        "w-full overflow-hidden rounded-lg border bg-card text-left shadow-card transition-shadow hover:shadow-pop",
                        openPhase === phase.phase_id ? "border-primary" : "border-border",
                      )}
                    >
                      <div
                        className="h-1.5 w-full"
                        style={{ backgroundColor: PHASE_COLOURS[phase.phase_id] }}
                      />
                      <div className="space-y-2 p-3">
                        <p
                          className="text-[10px] font-bold uppercase tracking-wide"
                          style={{ color: PHASE_COLOURS[phase.phase_id] }}
                        >
                          {phase.label}
                        </p>
                        <p className="text-sm font-semibold">{phase.name}</p>
                        <div className="h-1.5 overflow-hidden rounded-full bg-cream-dark">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${p.pct}%`,
                              backgroundColor: PHASE_COLOURS[phase.phase_id],
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="num text-muted-foreground">
                            {p.done}/{p.total} tasks
                          </span>
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 font-semibold",
                              status === "Active" && "bg-primary-light text-primary-dark",
                              status === "Complete" && "bg-success/15 text-success",
                              status === "Upcoming" && "bg-muted text-muted-foreground",
                            )}
                          >
                            {status}
                          </span>
                        </div>
                      </div>
                    </button>
                    {idx < phases.length - 1 && (
                      <div className="mx-auto h-6 w-px bg-border" aria-hidden />
                    )}
                  </div>
                );
              })}
            </div>

            {activePhase && (
              <div className="min-w-0 flex-1">
                <div
                  className="rounded-lg border border-l-4 border-border bg-card p-4 shadow-card"
                  style={{ borderLeftColor: PHASE_COLOURS[activePhase.phase_id] }}
                >
                  <p className="mb-3 text-sm font-semibold">
                    {activePhase.label}: {activePhase.name}
                  </p>
                  <div className="space-y-1.5">
                    {activePhase.tasks.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No tasks configured for this phase.
                      </p>
                    )}
                    {activePhase.tasks.map((task, index) => {
                      const done = !!client.tasks[taskKey(activePhase.phase_id, index)];
                      return (
                        <button
                          key={index}
                          onClick={() => onToggleTask(activePhase.phase_id, index, !done)}
                          className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-accent"
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                              done ? "border-success bg-success text-white" : "border-border",
                            )}
                          >
                            {done && <Check className="size-3" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "block text-[13px]",
                                done && "text-muted-foreground line-through",
                              )}
                            >
                              {task.t}
                            </span>
                            {task.n && (
                              <span className="block text-[11px] text-muted-foreground">
                                {task.n}
                              </span>
                            )}
                          </span>
                          {task.o && (
                            <span className="text-[11px] text-muted-foreground">{task.o}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
            <Donut pct={overall.pct} />
            <SummaryCard label="Tasks complete" value={overall.done} />
            <SummaryCard
              label="Tasks remaining"
              value={Math.max(0, overall.total - overall.done)}
            />
            <SummaryCard label="Phases complete" value={complete} />
          </div>
        </div>
      </div>
    </div>
  );
}
