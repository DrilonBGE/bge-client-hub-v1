import { useState } from "react";
import { Check, Lock, MessageSquare, PencilLine, Send, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TEAM } from "@/lib/bge";
import { useUpdateClient, logAudit } from "@/lib/queries";
import {
  copySlotsFor,
  copyOwner,
  copyRounds,
  copySlotClosed,
  finalCopy,
  latestCopyRound,
  notifyCopyDecided,
  notifyCopyReviewed,
  notifyCopySubmitted,
  readPayload,
  versionLabel,
  type CopyRound,
  type CopySlotState,
  type StepPayload,
} from "@/lib/journey-steps";
import { mirrorFinalDeliverable } from "@/lib/links";
import type { TaskRow } from "@/lib/journey";

type CopyClient = { id: string; name: string; phase?: number; vsl_writer?: string | null };

/** Which final document each piece of copy becomes on the key links tab. */
const FINAL_LABELS: Record<string, string> = {
  "VSL Copy": "Final VSL copy",
  "Ads Copy": "Final ads copy",
  "TY Page Video Copy": "Final thank you page / next steps copy",
  "9 FAQ Videos Copy": "Final 9 frequently asked questions document",
  "Pre call email sequence copy": "Final pre-call email sequence",
  "Cancellation email sequence copy": "Final cancellation email sequence",
  "No show email sequence copy": "Final no-show email sequence",
  "Post call no close email sequence copy": "Final post-call no-close email sequence",
};

function slotTone(slot: CopySlotState) {
  if (copySlotClosed(slot)) return "border-success/60 bg-success/5";
  const last = latestCopyRound(slot);
  if (last.clientSentAt) return "border-warning/60 bg-warning/5";
  if (last.submittedAt) return "border-primary/40 bg-primary/5";
  return "border-border bg-card";
}

function slotLabel(slot: CopySlotState) {
  const last = latestCopyRound(slot);
  if (copySlotClosed(slot)) return { text: "Approved and final", tone: "text-success" };
  if (last.clientSentAt && last.decision === "comments")
    return { text: "Comments received — rewrite needed", tone: "text-warning" };
  if (last.clientSentAt && last.decision === "edited")
    return { text: "Client sent their own version — check it", tone: "text-warning" };
  if (last.submittedAt) return { text: "With the client", tone: "text-muted-foreground" };
  if (last.locked) return { text: "Ready to send", tone: "text-muted-foreground" };
  return { text: "Being written", tone: "text-muted-foreground" };
}

/**
 * Every piece of copy, one row each. Our writing, our notes, the client's
 * review, and a fresh version underneath whenever a rewrite is needed.
 */
export function CopyDesk({
  task,
  client,
  readOnly,
  locked,
  save,
}: {
  task: TaskRow;
  client: CopyClient;
  readOnly: boolean;
  locked: boolean;
  save: (payload: StepPayload) => void;
}) {
  const payload = readPayload(task);
  const SLOTS = copySlotsFor(task.step_key);
  const slots = payload.slots ?? {};
  const updateClient = useUpdateClient();
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  /** What the client is typing right now, so pressing Send never loses it. */
  const [typed, setTyped] = useState<Record<string, { clientNote?: string; clientText?: string }>>(
    {},
  );

  const writeRounds = (name: string, rounds: CopyRound[], extra?: Partial<StepPayload>) => {
    const next = { ...slots, [name]: { ...(slots[name] ?? {}), rounds } };
    const everySettled = SLOTS.every((item) => copySlotClosed(next[item]));
    const notify = everySettled && !payload.notifiedDecided;
    save({
      ...payload,
      slots: next,
      ...(notify ? { notifiedDecided: true } : {}),
      ...extra,
    });
    if (notify) void notifyCopyDecided(client);
  };

  /** Change the newest round of one piece of copy. */
  const setLatest = (name: string, patch: Partial<CopyRound>) => {
    const rounds = [...copyRounds(slots[name])];
    rounds[rounds.length - 1] = { ...rounds[rounds.length - 1], ...patch };
    writeRounds(name, rounds);
  };

  const settled = SLOTS.every((name) => copySlotClosed(slots[name]));

  const submitPicked = () => {
    const stamp = new Date().toISOString();
    const by = latestCopyRound(slots[picked[0]!]).by ?? copyOwner(client.vsl_writer);
    const next = { ...slots };
    const sent: string[] = [];
    for (const name of picked) {
      const rounds = [...copyRounds(slots[name])];
      const last = rounds[rounds.length - 1] ?? {};
      if (!last.text) continue;
      rounds[rounds.length - 1] = {
        ...last,
        submittedAt: stamp,
        submittedBy: last.by ?? by,
        locked: true,
      };
      next[name] = { ...(slots[name] ?? {}), rounds };
      sent.push(versionLabel(name, rounds.length - 1));
    }
    if (!sent.length) return;
    save({ ...payload, slots: next });
    void notifyCopySubmitted(client, sent, by);
    void logAudit("copy_submitted", client.name, `${sent.join(", ")} sent to the client`);
    setPicked([]);
  };

  /** The client presses send on their own review of one piece. */
  const sendReview = (name: string) => {
    const rounds = [...copyRounds(slots[name])];
    const index = rounds.length - 1;
    const draft = typed[`${name}-${index}`] ?? {};
    const last = { ...rounds[index], ...draft };
    if (!last.decision) return;
    last.clientSentAt = new Date().toISOString();
    rounds[index] = last;
    // Comments mean a rewrite: a fresh version opens underneath.
    if (last.decision === "comments") rounds.push({});
    writeRounds(name, rounds);
    void notifyCopyReviewed(
      client,
      [
        `${versionLabel(name, index)}: ${last.decision}${last.clientNote ? ` — ${last.clientNote}` : ""}`,
      ],
      last.submittedBy ?? last.by ?? null,
      last.decision,
    );
    if (last.decision === "approved") {
      void mirrorFinalDeliverable(client.id, FINAL_LABELS[name] ?? name, last.text ?? "");
    }
  };

  /** Our answer to a client's own final version. */
  const answerEdited = (name: string, decision: "approved" | "revise") => {
    const rounds = [...copyRounds(slots[name])];
    const index = rounds.length - 1;
    rounds[index] = { ...rounds[index], teamDecision: decision };
    if (decision === "revise") rounds.push({});
    writeRounds(name, rounds);
    if (decision === "approved") {
      const text = rounds[index]?.clientText ?? rounds[index]?.text ?? "";
      void mirrorFinalDeliverable(client.id, FINAL_LABELS[name] ?? name, text);
      void logAudit("copy_approval", client.name, `${name} — client version approved`);
    }
  };

  return (
    <div className="mt-3 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Copy · {copyOwner(client.vsl_writer)}
      </p>

      {SLOTS.map((name) => {
        const slot: CopySlotState = slots[name] ?? {};
        const rounds = copyRounds(slot);
        const label = slotLabel(slot);
        const last = latestCopyRound(slot);
        const closed = copySlotClosed(slot);
        const isOpen = open === name;

        return (
          <div key={name} className={cn("rounded-xl border p-3 transition-colors", slotTone(slot))}>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : name)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-[13px] font-semibold">
                  {name}
                  {rounds.length > 1 && (
                    <span className="ml-1.5 text-[10px] font-bold uppercase text-primary">
                      now on V{rounds.length}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] uppercase tracking-wide">
                  <span className={label.tone}>{label.text}</span>
                  {last.by && <span className="text-muted-foreground">Written by {last.by}</span>}
                </span>
              </button>

              {!readOnly && !closed && (
                <>
                  <select
                    value={last.by ?? ""}
                    disabled={locked || Boolean(last.submittedAt)}
                    onChange={(event) => setLatest(name, { by: event.target.value })}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    aria-label={`Who wrote the ${name}`}
                  >
                    <option value="">Who wrote it</option>
                    {TEAM.map((member) => (
                      <option key={member}>{member}</option>
                    ))}
                  </select>
                  {!last.submittedAt && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant={last.locked ? "default" : "outline"}
                        disabled={locked || !last.text}
                        onClick={() => setLatest(name, { locked: !last.locked })}
                      >
                        <Lock className="size-3.5" /> {last.locked ? "Locked in" : "Place in app"}
                      </Button>
                      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={picked.includes(name)}
                          disabled={!last.locked || locked}
                          onChange={(event) =>
                            setPicked((list) =>
                              event.target.checked
                                ? [...list, name]
                                : list.filter((item) => item !== name),
                            )
                          }
                        />
                        Send
                      </label>
                    </>
                  )}
                </>
              )}
            </div>

            {isOpen && (
              <div className="mt-3 space-y-3">
                {rounds.map((round, index) => {
                  const isLast = index === rounds.length - 1;
                  const title = versionLabel(name, index);
                  const visible = readOnly ? Boolean(round.submittedAt) : true;
                  const editable = !readOnly && !locked && isLast && !round.submittedAt;

                  if (!visible) {
                    return (
                      <p
                        key={index}
                        className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground"
                      >
                        We are writing {title} now. It will appear here as soon as it is sent over.
                      </p>
                    );
                  }

                  return (
                    <div
                      key={index}
                      className="rounded-lg border border-border bg-background/40 p-3"
                    >
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                        {title}
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block text-[11px] text-muted-foreground">
                          {title}
                          <Textarea
                            key={`t-${name}-${index}-${round.text ?? ""}`}
                            defaultValue={round.text ?? ""}
                            readOnly={!editable}
                            rows={4}
                            placeholder={
                              editable ? "Link, file or the copy itself" : "Not written yet"
                            }
                            onBlur={(event) => {
                              if ((round.text ?? "") === event.target.value) return;
                              setLatest(name, { text: event.target.value });
                            }}
                            className="mt-1 bg-background text-xs"
                          />
                        </label>
                        <label className="block text-[11px] text-muted-foreground">
                          Notes about {index === 0 ? name : `final ${name.toLowerCase()}`}
                          <Textarea
                            key={`n-${name}-${index}-${round.note ?? ""}`}
                            defaultValue={round.note ?? ""}
                            readOnly={!editable}
                            rows={4}
                            placeholder={editable ? "Anything they should know" : "No notes"}
                            onBlur={(event) => {
                              if ((round.note ?? "") === event.target.value) return;
                              setLatest(name, { note: event.target.value });
                            }}
                            className="mt-1 bg-background text-xs"
                          />
                        </label>
                      </div>

                      {round.submittedAt && (
                        <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {readOnly ? "Your review" : "Client review"}
                          </p>

                          {readOnly && !round.clientSentAt ? (
                            <div className="flex flex-wrap gap-2">
                              {(
                                [
                                  ["approved", "Approve", ThumbsUp],
                                  ["comments", "Add comments", MessageSquare],
                                  ["edited", "Edit final version myself", PencilLine],
                                ] as const
                              ).map(([key, text, Icon]) => (
                                <Button
                                  key={key}
                                  type="button"
                                  size="sm"
                                  variant={round.decision === key ? "default" : "outline"}
                                  disabled={locked}
                                  onClick={() => setLatest(name, { decision: key })}
                                >
                                  <Icon className="size-3.5" /> {text}
                                </Button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">
                              {round.decision === "approved" && "Approved."}
                              {round.decision === "comments" && "Comments left for the team."}
                              {round.decision === "edited" && "Own final version sent back."}
                              {!round.decision && "Not reviewed yet."}
                            </p>
                          )}

                          {round.decision === "comments" && (
                            <Textarea
                              value={
                                typed[`${name}-${index}`]?.clientNote ?? round.clientNote ?? ""
                              }
                              readOnly={!readOnly || Boolean(round.clientSentAt)}
                              rows={3}
                              placeholder="What would you like the team to change?"
                              onChange={(event) =>
                                setTyped((all) => ({
                                  ...all,
                                  [`${name}-${index}`]: {
                                    ...all[`${name}-${index}`],
                                    clientNote: event.target.value,
                                  },
                                }))
                              }
                              onBlur={(event) => {
                                if ((round.clientNote ?? "") === event.target.value) return;
                                setLatest(name, { clientNote: event.target.value });
                              }}
                              className="bg-background text-xs"
                            />
                          )}

                          {round.decision === "edited" && (
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="block text-[11px] text-muted-foreground">
                                {readOnly ? "Your final version" : "Their final version"}
                                <Textarea
                                  value={
                                    typed[`${name}-${index}`]?.clientText ?? round.clientText ?? ""
                                  }
                                  readOnly={!readOnly || Boolean(round.clientSentAt)}
                                  rows={4}
                                  placeholder="Paste your final version or a link to it"
                                  onChange={(event) =>
                                    setTyped((all) => ({
                                      ...all,
                                      [`${name}-${index}`]: {
                                        ...all[`${name}-${index}`],
                                        clientText: event.target.value,
                                      },
                                    }))
                                  }
                                  onBlur={(event) => {
                                    if ((round.clientText ?? "") === event.target.value) return;
                                    setLatest(name, { clientText: event.target.value });
                                  }}
                                  className="mt-1 bg-background text-xs"
                                />
                              </label>
                              <label className="block text-[11px] text-muted-foreground">
                                Notes about the final version
                                <Textarea
                                  value={
                                    typed[`${name}-${index}`]?.clientNote ?? round.clientNote ?? ""
                                  }
                                  readOnly={!readOnly || Boolean(round.clientSentAt)}
                                  rows={4}
                                  placeholder="Anything we should know about your changes"
                                  onChange={(event) =>
                                    setTyped((all) => ({
                                      ...all,
                                      [`${name}-${index}`]: {
                                        ...all[`${name}-${index}`],
                                        clientNote: event.target.value,
                                      },
                                    }))
                                  }
                                  onBlur={(event) => {
                                    if ((round.clientNote ?? "") === event.target.value) return;
                                    setLatest(name, { clientNote: event.target.value });
                                  }}
                                  className="mt-1 bg-background text-xs"
                                />
                              </label>
                            </div>
                          )}

                          {readOnly && !round.clientSentAt && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={locked || !round.decision}
                              onClick={() => sendReview(name)}
                            >
                              <Send className="size-3.5" /> Send
                            </Button>
                          )}

                          {!readOnly &&
                            round.decision === "edited" &&
                            round.clientSentAt &&
                            !round.teamDecision && (
                              <div className="flex flex-wrap gap-2 border-t border-border pt-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => answerEdited(name, "approved")}
                                >
                                  <Check className="size-3.5" /> Approve their version
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => answerEdited(name, "revise")}
                                >
                                  <PencilLine className="size-3.5" /> Write a new version
                                </Button>
                              </div>
                            )}

                          {round.teamDecision === "approved" && (
                            <p className="text-[11px] font-semibold text-success">
                              Approved — this is the final version.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {closed && (
                  <p className="rounded-lg border border-success/50 bg-success/10 px-3 py-2 text-[11px] text-success">
                    Final version saved to key links and documents.
                    {finalCopy(slot) ? "" : " Add the final wording so it appears there."}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <Button
            type="button"
            size="sm"
            disabled={!picked.length || locked}
            onClick={submitPicked}
          >
            <Send className="size-3.5" /> Submit to client
            {picked.length ? ` (${picked.length})` : ""}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Tick everything ready and send it in one go — the client gets a single notification.
          </p>
        </div>
      )}

      {!readOnly && settled && (
        <div className="rounded-lg border border-success/50 bg-success/5 p-3">
          <p className="text-[11px] text-muted-foreground">
            Every piece of copy is settled and final.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-2"
            disabled={payload.teamApproved || locked}
            onClick={() => {
              save({ ...payload, teamApproved: true });
              updateClient.mutate({
                id: client.id,
                patch: { phase: Math.max(client.phase ?? 1, 2) } as never,
              });
              void logAudit("copy_signed_off", client.name, "Copy signed off — moved to Phase 2");
            }}
          >
            <Check className="size-3.5" />
            {payload.teamApproved ? "Signed off" : "Approve and move to Funnel Build"}
          </Button>
        </div>
      )}

      {readOnly && settled && !payload.teamApproved && (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          Thank you — the team is doing a final check before your funnel build starts.
        </p>
      )}
    </div>
  );
}
