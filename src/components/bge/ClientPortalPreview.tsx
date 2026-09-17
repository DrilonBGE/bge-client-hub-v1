import { CheckCircle2, Eye, EyeOff, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { PHASE_COLOURS, type Client } from "@/lib/bge";
import { formatDate, statusMeta } from "@/lib/journey";
import { useApprovals, useTasks, useUploads } from "@/lib/journey-queries";
import { useUpdateClient } from "@/lib/queries";
import { EmptyState, FieldLabel, ProgressBar } from "@/components/bge/atoms";

type Phase = { phase_id: number; label: string; name: string };

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

export function ClientPortalPreview({ client, phases }: { client: Client; phases: Phase[] }) {
  const { data: allTasks } = useTasks(client.id);
  const { data: uploads } = useUploads(client.id);
  const { data: approvals } = useApprovals(client.id);
  const update = useUpdateClient();

  const tasks = (allTasks ?? []).filter((t) => t.client_visible);
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const next = tasks.find((t) => t.status !== "done");
  const mine = tasks.filter((t) => t.owner === "Client");
  const stage = phases.find((p) => p.phase_id === client.phase);
  const latest = (approvals ?? [])[0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-[12px]">
        <Eye className="size-3.5 text-primary" />
        <span className="font-semibold">Exactly what {client.name} sees</span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <EyeOff className="size-3.5" /> Internal notes, health, difficulty, delay causes and other
          clients stay hidden
        </span>
      </div>

      <Block title="Their stage">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: PHASE_COLOURS[client.phase] }}
            />
            <span className="font-semibold">
              {stage ? `${stage.label} — ${stage.name}` : "Getting started"}
            </span>
            <span className="num text-[12px] text-muted-foreground">
              {done}/{tasks.length} steps complete ({pct}%)
            </span>
          </div>
          <ProgressBar pct={pct} phase={client.phase} />
        </div>
      </Block>

      <Block title="Their next step">
        {next ? (
          <div className="text-[13px]">
            <p className="font-medium">{next.title}</p>
            <p className="text-muted-foreground">
              With {next.owner ?? "our team"} · expected {formatDate(next.expected_date)} ·{" "}
              <span style={{ color: statusMeta(next.status).colour }}>
                {statusMeta(next.status).label}
              </span>
            </p>
            {next.status_note && <p className="text-muted-foreground">{next.status_note}</p>}
          </div>
        ) : (
          <EmptyState>Nothing outstanding on their roadmap.</EmptyState>
        )}
      </Block>

      <Block title={`Their to-do list (${mine.length})`}>
        {mine.length === 0 ? (
          <EmptyState>Nothing on their plate right now.</EmptyState>
        ) : (
          <ul className="space-y-1.5">
            {mine.map((task) => (
              <li
                key={task.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border px-2.5 py-2 text-[12px]"
              >
                <CheckCircle2
                  className={cn(
                    "size-3.5",
                    task.status === "done" ? "text-success" : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1",
                    task.status === "done" && "line-through opacity-60",
                  )}
                >
                  {task.title}
                </span>
                <span className="num text-muted-foreground">{formatDate(task.expected_date)}</span>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Their documents">
        {(uploads ?? []).length === 0 ? (
          <EmptyState>No documents shared yet.</EmptyState>
        ) : (
          <ul className="space-y-1.5">
            {(uploads ?? []).map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border px-2.5 py-2 text-[12px]"
              >
                <span className="min-w-0 flex-1">{u.label}</span>
                <span className="text-muted-foreground">
                  {u.by_client ? "From client" : "From us"}
                </span>
                <a
                  href={u.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Open <ExternalLink className="size-3" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Copy approval">
        <div className="space-y-2">
          <FieldLabel>Copy ready for them to approve</FieldLabel>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={client.copy_ready}
              onChange={(e) =>
                update.mutate({ id: client.id, patch: { copy_ready: e.target.checked } })
              }
            />
            {client.copy_ready
              ? "They can approve their copy now"
              : "They see “still being written”"}
          </label>
          {latest ? (
            <p className="text-[12px]">
              <span
                className="font-semibold"
                style={{
                  color: latest.decision === "approved" ? "var(--success)" : "var(--warning)",
                }}
              >
                {latest.decision === "approved" ? "All good" : "Editing needed"}
              </span>{" "}
              <span className="text-muted-foreground">
                {latest.note ? `— ${latest.note} ` : ""}
                {formatDate(latest.created_at)}
              </span>
            </p>
          ) : (
            <EmptyState>No decision from them yet.</EmptyState>
          )}
        </div>
      </Block>
    </div>
  );
}
