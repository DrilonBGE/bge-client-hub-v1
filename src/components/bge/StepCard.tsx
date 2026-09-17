import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CircleDot,
  Download,
  FileText,
  Lock,
  Maximize2,
  Minimize2,
  Send,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatDate, statusMeta, type TaskRow } from "@/lib/journey";
import {
  notifyClientSubmission,
  notifyCopywriting,
  notifyFunnelReview,
  stepLocked,
  stepSpec,
  stepTemplateUrl,
  notifyStepOwner,
  type StepPayload,
} from "@/lib/journey-steps";
import { useMyName, useTaskMutations } from "@/lib/journey-queries";
import { CopyDesk } from "@/components/bge/CopyDesk";
import { AssetDesk } from "@/components/bge/AssetDesk";
import { FunnelDesk } from "@/components/bge/FunnelDesk";
import { SignUpDesk } from "@/components/bge/SignUpDesk";
import { JOURNEY_DOCUMENT_LABELS, mirrorDocumentLink } from "@/lib/links";
import { PortalOnboarding } from "@/components/bge/PortalOnboarding";
import { logAudit, useUpdateClient } from "@/lib/queries";

type StepClient = {
  id: string;
  name: string;
  phase?: number;
  vsl_writer?: string | null;
  program?: string | null;
  roadmap_program?: string | null;
  phone?: string | null;
};

const STATES = [
  { key: "done", label: "Task complete", icon: Check },
  { key: "in_progress", label: "In progress", icon: CircleDot },
] as const;

function StateButtons({
  task,
  disabled,
  onPick,
}: {
  task: TaskRow;
  disabled: boolean;
  onPick: (status: string) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {STATES.map(({ key, label, icon: Icon }) => {
        const active =
          task.status === key ||
          (key === "in_progress" && task.status !== "done" && task.status !== "to_come");
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={() => onPick(key)}
            className={cn(
              "flex size-7 items-center justify-center rounded-full border transition-all",
              !active && "border-border text-muted-foreground",
              active && key === "done" && "border-success bg-success text-background",
              active && key === "in_progress" && "border-warning bg-warning/15 text-warning",
              !disabled && "hover:scale-110",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}

/**
 * One step of the journey: instructions, any template, what the client sends
 * back, and the three-state control for where it is up to.
 */
export function StepCard({
  task,
  tasks,
  client,
  readOnly,
  colour,
  forceLocked = false,
}: {
  task: TaskRow;
  tasks: TaskRow[];
  client: StepClient;
  readOnly: boolean;
  colour: string;
  /** Stages the client has not reached yet: readable, but nothing can be filled in. */
  forceLocked?: boolean;
}) {
  const spec = stepSpec(task.step_key);
  const templateUrl = stepTemplateUrl(spec, client);
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(false);
  const { update } = useTaskMutations();
  const qc = useQueryClient();
  const { data: myName = "" } = useMyName();
  const updateClient = useUpdateClient();
  const [submissionUrl, setSubmissionUrl] = useState(task.submission_url ?? "");
  const [submissionNote, setSubmissionNote] = useState(task.submission_note ?? "");

  useEffect(() => {
    setSubmissionUrl(task.submission_url ?? "");
    setSubmissionNote(task.submission_note ?? "");
  }, [task.submission_url, task.submission_note]);
  const locked = forceLocked || stepLocked(task, tasks, readOnly);
  const kind = (task.step_kind ?? "team") as "client" | "team" | "either";
  const isDrilon = /drilon/i.test(myName);
  const canChange =
    !locked &&
    (!readOnly || kind === "client" || kind === "either") &&
    (!spec?.drilonOnly || (!readOnly && isDrilon));

  const patch = (next: Parameters<typeof update.mutate>[0]["patch"]) =>
    update.mutate({ id: task.id, patch: next });

  const pick = (status: string) => {
    patch({
      status,
      actual_date:
        status === "done" ? (task.actual_date ?? new Date().toISOString().slice(0, 10)) : null,
    });
    void logAudit("task_status", client.name, `${task.title} → ${statusMeta(status).label}`);
    const newlyDone = status === "done" && task.status !== "done";
    // Whoever owns the next step now needs to move — tell them, not everyone.
    if (newlyDone) {
      const next = tasks
        .filter((row) => row.phase_id === task.phase_id && row.step_key && row.status !== "done")
        .sort((a, b) => a.gate_order - b.gate_order)
        .find((row) => row.id !== task.id);
      if (next?.step_key)
        void notifyStepOwner(
          client,
          next.step_key,
          `${next.title} is next — ${client.name}`,
          `${task.title} is done, so this is now the next move — /clients/${client.id}`,
        );
    }
    if (newlyDone && task.step_key === "p1-information-doc") void notifyCopywriting(client);
    // Finishing the editing step takes them into Pre-Launch and prompts Drilon.
    if (newlyDone && task.step_key === "p2-edit-assets") {
      updateClient.mutate({
        id: client.id,
        patch: { phase: Math.max(client.phase ?? 2, 3) } as never,
      });
      void notifyFunnelReview(client);
    }
  };

  const submissionUnchanged =
    submissionUrl === (task.submission_url ?? "") &&
    submissionNote === (task.submission_note ?? "");

  const submitWork = () => {
    if (submissionUnchanged) return;
    patch({ submission_url: submissionUrl || null, submission_note: submissionNote || null });
    const label = JOURNEY_DOCUMENT_LABELS[task.step_key ?? ""];
    if (label && submissionUrl) {
      void mirrorDocumentLink(client.id, label, submissionUrl).then(() =>
        qc.invalidateQueries({ queryKey: ["clients"] }),
      );
    }
    if (readOnly && submissionUrl) void notifyClientSubmission(client, tasks, task, "document");
    else if (readOnly && submissionNote) void notifyClientSubmission(client, tasks, task, "note");
  };

  const done = task.status === "done";

  const body = (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 p-3 sm:flex">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex items-center gap-1.5 text-sm font-medium">
            {locked && <Lock className="size-3 shrink-0 text-muted-foreground" />}
            <span className="truncate">{task.title}</span>
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] uppercase tracking-wide text-muted-foreground">
            <span>{task.owner ?? "Unassigned"} task</span>
            {locked && <span className="text-muted-foreground">Not required yet</span>}
          </span>
        </button>
        <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-1 sm:contents">
          {open && (
            <button
              type="button"
              onClick={() => setFull((value) => !value)}
              title={full ? "Close full screen" : "Open full screen"}
              aria-label={full ? "Close full screen" : "Open full screen"}
              className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {full ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
          )}
          <StateButtons task={task} disabled={!canChange} onPick={pick} />
        </div>
      </div>

      {open && (
        <div className="animate-accordion-down border-t border-border px-3 py-3">
          {spec?.instructions && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Instructions: </span>
              {spec.instructions}
            </p>
          )}
          {task.detail && <p className="mt-2 text-xs text-muted-foreground">{task.detail}</p>}

          {spec?.templateLabel && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-2.5">
              <FileText className="size-4 text-primary" />
              <span className="text-xs font-medium">{spec.templateLabel}</span>
              {templateUrl ? (
                <Button asChild size="sm" variant="outline" disabled={locked}>
                  <a
                    href={templateUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={templateUrl.startsWith("/") || undefined}
                  >
                    <Download className="size-3.5" /> Download
                  </a>
                </Button>
              ) : (
                <span className="text-[11px] text-muted-foreground">Template coming soon</span>
              )}
            </div>
          )}

          {spec?.submission && (
            <div className="mt-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Insert completed version here
              </p>
              <Input
                value={submissionUrl}
                readOnly={locked}
                placeholder="Paste the link to your completed document"
                onChange={(event) => setSubmissionUrl(event.target.value)}
                className="h-9 bg-background text-sm"
              />
              <Textarea
                value={submissionNote}
                readOnly={locked}
                placeholder="Anything we should know about it"
                rows={2}
                onChange={(event) => setSubmissionNote(event.target.value)}
                className="bg-background text-xs"
              />
              <Button
                type="button"
                size="sm"
                disabled={locked || submissionUnchanged}
                onClick={submitWork}
              >
                <Send className="mr-1 size-3.5" /> Submit
              </Button>
            </div>
          )}

          {spec?.copyDesk && (
            <CopyDesk
              task={task}
              client={client}
              readOnly={readOnly}
              locked={locked}
              save={(payload) => patch({ step_payload: payload as never })}
            />
          )}

          {spec?.assetDesk && (
            <AssetDesk
              task={task}
              client={client}
              readOnly={readOnly}
              locked={locked}
              save={(payload) => patch({ step_payload: payload as never })}
            />
          )}

          {spec?.funnelDesk && (
            <FunnelDesk
              task={task}
              client={client}
              readOnly={readOnly}
              canSignOff={!readOnly && isDrilon && !locked}
              save={(payload) => patch({ step_payload: payload as never })}
              onSignedOff={() => pick("done")}
            />
          )}

          {spec?.signUp && (
            <div className="mt-3">
              <SignUpDesk client={client} task={task} spec={spec.signUp} locked={locked} />
            </div>
          )}

          {spec?.welcomeDocs && (
            <div className="mt-3">
              <PortalOnboarding
                client={client}
                preview={!readOnly}
                embedded
                onDone={() => pick("done")}
              />
            </div>
          )}

          {spec?.contentPlan && (
            <p className="mt-3 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              Everything for this one lives in the Content plan tab at the bottom of the page: the
              competitor analysis template, the completed sheet and our feedback.
            </p>
          )}

          {spec?.automatic && (
            <p className="mt-3 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              This one moves along on its own as the weeks pass after launch — nothing to tick.
            </p>
          )}
        </div>
      )}
    </>
  );

  const shell = cn(
    "rounded-xl border bg-card/95 transition-all duration-300",
    done
      ? "border-success/70 bg-success/10"
      : open
        ? "border-primary/60 shadow-ember"
        : "border-border hover:border-primary/50",
    locked && "opacity-60 saturate-50",
  );
  const edge = {
    boxShadow: `inset 3px 0 0 0 ${done ? "var(--success)" : open ? colour : `${colour}66`}`,
  };

  if (full) {
    return (
      <>
        <div className={shell} style={edge}>
          <div className="p-3 text-sm font-medium">{task.title}</div>
        </div>
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-md sm:p-8">
          <div
            className={cn(shell, "w-full max-w-3xl shadow-pop")}
            style={edge}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {body}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={shell} style={edge}>
      {body}
    </div>
  );
}
