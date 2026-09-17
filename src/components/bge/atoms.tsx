import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/text";
import { PHASE_COLOURS, isCombinationProgram, programColour, programStyle } from "@/lib/bge";

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </label>
  );
}

export function ProgramBadge({ program }: { program: string | null | undefined }) {
  if (!program) return null;
  const combination = isCombinationProgram(program);
  return (
    <span
      className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"
      style={programStyle(program)}
      title={
        combination
          ? "Mixed tiers — the task list follows the first tier listed and can be adjusted by hand"
          : undefined
      }
    >
      {program}
    </span>
  );
}

export function PhaseDot({ phase }: { phase: number }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: PHASE_COLOURS[phase] }}
    />
  );
}

export function ProgressBar({ pct, phase }: { pct: number; phase: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-dark">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${pct}%`,
          background: pct === 100 ? "var(--gradient-ember)" : PHASE_COLOURS[phase],
          boxShadow: "0 0 10px var(--glow)",
        }}
      />
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-card">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="num mt-1 text-2xl font-bold" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card shadow-card", className)}>
      <header className="grid grid-cols-1 items-center gap-2 border-b border-border px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-4">
        <h2 className="min-w-0 text-sm font-semibold">{titleCase(title)}</h2>
        <div className="min-w-0">{action}</div>
      </header>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

export function DaysChip({ days }: { days: number }) {
  const tone =
    days <= 10
      ? "bg-destructive/10 text-destructive"
      : days <= 30
        ? "bg-warning/15 text-warning"
        : "bg-muted text-muted-foreground";
  return (
    <span className={cn("num rounded px-1.5 py-0.5 text-[11px] font-semibold", tone)}>
      {days < 0 ? "overdue" : `${days}d`}
    </span>
  );
}
