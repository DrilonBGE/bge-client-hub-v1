import { useState } from "react";
import { CheckCircle2, ExternalLink, FileText, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { TaskRow } from "@/lib/journey";
import { readPayload, type SignUpSpec } from "@/lib/journey-steps";
import { notify, useTaskMutations } from "@/lib/journey-queries";
import { useUpdateClient } from "@/lib/queries";

/**
 * A sign-up step: the client either takes the product on, or tells us why not.
 * Either answer finishes the step and shows up on the upsells page.
 */
export function SignUpDesk({
  client,
  task,
  spec,
  locked,
}: {
  client: { id: string; name: string };
  task: TaskRow;
  spec: SignUpSpec;
  locked: boolean;
}) {
  const payload = readPayload(task);
  const answer = payload.signUp;
  const { update } = useTaskMutations();
  const updateClient = useUpdateClient();
  const [optOut, setOptOut] = useState(false);
  const [reason, setReason] = useState(answer?.reason ?? "");
  const [using, setUsing] = useState(answer?.using ?? "");

  const noteField = `${spec.field}_client_note` as const;

  const save = (taken: boolean) => {
    update.mutate({
      id: task.id,
      patch: {
        step_payload: {
          ...payload,
          signUp: {
            taken,
            answeredAt: new Date().toISOString(),
            reason: taken ? "" : reason.trim(),
            using: taken ? "" : using.trim(),
          },
        } as never,
        status: "done",
        actual_date: new Date().toISOString().slice(0, 10),
      },
    });
    updateClient.mutate({
      id: client.id,
      patch: {
        [spec.field]: taken ? "Yes" : "No",
        [noteField]: taken ? "" : [reason.trim(), using.trim()].filter(Boolean).join(" — "),
      } as never,
    });
    void notify({
      client_id: client.id,
      audience: "team",
      kind: "info",
      title: taken
        ? `${client.name} has signed up to ${spec.product}`
        : `${client.name} is not using ${spec.product}`,
      body: taken ? "Marked on the upsells page." : reason.trim() || "No reason given.",
    });
    toast.success(taken ? `${spec.product} marked as signed up.` : "Thanks — that's noted.");
    setOptOut(false);
  };

  /** Undo the answer, so the step can be answered again. */
  const clearAnswer = () => {
    const { signUp: _dropped, ...rest } = payload as Record<string, unknown>;
    update.mutate({
      id: task.id,
      patch: {
        step_payload: rest as never,
        status: "to_come",
        actual_date: null,
      },
    });
    updateClient.mutate({
      id: client.id,
      patch: { [spec.field]: null, [noteField]: null } as never,
    });
    setOptOut(false);
    setReason("");
    setUsing("");
    toast.success("Answer cleared.");
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {spec.url ? (
          <Button asChild size="sm">
            <a href={spec.url} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 size-3.5" /> Sign up to {spec.product}
            </a>
          </Button>
        ) : (
          <span className="rounded-md border border-dashed border-border px-2.5 py-1 text-[11px] text-muted-foreground">
            {spec.product} sign-up link to follow
          </span>
        )}
        {spec.guideUrl ? (
          <Button asChild size="sm" variant="ghost">
            <a href={spec.guideUrl} target="_blank" rel="noreferrer">
              <FileText className="mr-1 size-3.5" /> How to use {spec.product}
            </a>
          </Button>
        ) : (
          <span className="text-[11px] text-muted-foreground">Guide to follow</span>
        )}
      </div>

      {answer?.answeredAt ? (
        <div
          className={cn(
            "flex items-start gap-2 rounded-md border px-3 py-2 text-[12px]",
            answer.taken
              ? "border-success/50 bg-success/10 text-success"
              : "border-warning/50 bg-warning/10 text-warning",
          )}
        >
          <span className="flex-1">
            <span className="font-semibold">
              {answer.taken ? `Signed up to ${spec.product}.` : `Not using ${spec.product}.`}
            </span>
            {answer.reason ? ` ${answer.reason}` : ""}
            {answer.using ? ` Currently using: ${answer.using}.` : ""}
          </span>
          {!locked && (
            <button
              type="button"
              onClick={clearAnswer}
              aria-label="Clear this answer"
              title="Clear this answer and choose again"
              className="opacity-70 hover:opacity-100"
            >
              <XCircle className="size-4" />
            </button>
          )}
        </div>
      ) : locked ? (
        <p className="text-[12px] text-muted-foreground">
          This opens up once the steps before it are finished.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => save(true)}>
              <CheckCircle2 className="mr-1 size-3.5" /> I have signed up
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOptOut((value) => !value)}
              className="border border-border"
            >
              <XCircle className="mr-1 size-3.5" /> I am not using {spec.product}
            </Button>
          </div>

          {optOut && (
            <div className="space-y-2 rounded-md border border-warning/40 bg-warning/5 p-3">
              <p className="text-[12px] text-muted-foreground">{spec.optOutHint}</p>
              <p className="text-[12px] font-semibold">{spec.warning}</p>
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                placeholder="Your reason — for example, I already have my own CRM"
                className="bg-background text-xs"
              />
              <Input
                value={using}
                onChange={(event) => setUsing(event.target.value)}
                placeholder={`What you use instead of ${spec.product}`}
                className="h-9 bg-background text-sm"
              />
              <Button size="sm" disabled={!reason.trim()} onClick={() => save(false)}>
                Send
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
