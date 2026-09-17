import { useState } from "react";
import { Check, PencilLine, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { logAudit } from "@/lib/queries";
import { mirrorFinalDeliverable } from "@/lib/links";
import {
  ASSET_SLOTS,
  assetApproved,
  assetDrafts,
  latestAssetDraft,
  notifyAssetsReviewed,
  notifyAssetsSubmitted,
  readPayload,
  type AssetDraft,
  type AssetReview,
  type StepPayload,
} from "@/lib/journey-steps";
import type { TaskRow } from "@/lib/journey";

type AssetClient = { id: string; name: string; phase?: number; vsl_writer?: string | null };

function draftLabel(index: number) {
  const names = ["1st draft link", "2nd draft link", "3rd draft link"];
  return names[index] ?? `Draft ${index + 1} link`;
}

/**
 * The video assets. The client adds a draft and their thoughts, sends it over,
 * we approve it or write notes back — and a fresh draft slot opens each time.
 */
export function AssetDesk({
  task,
  client,
  readOnly,
  locked,
  save,
}: {
  task: TaskRow;
  client: AssetClient;
  readOnly: boolean;
  locked: boolean;
  save: (payload: StepPayload) => void;
}) {
  const payload = readPayload(task);
  const assets = payload.assets ?? {};
  const editing = task.step_key === "p2-edit-assets";
  /** Slots ticked for the one grouped send at the bottom. */
  const [picked, setPicked] = useState<string[]>([]);

  const writeDrafts = (slot: string, drafts: AssetDraft[], base = assets) => {
    const next = {
      ...base,
      [slot]: { ...(base[slot] ?? {}), drafts },
    };
    save({ ...payload, assets: next });
    return next;
  };

  const setLatest = (slot: string, patch: Partial<AssetDraft>) => {
    const drafts = [...assetDrafts(assets[slot])];
    drafts[drafts.length - 1] = { ...drafts[drafts.length - 1], ...patch };
    writeDrafts(slot, drafts);
  };

  /** The client sends every ticked draft over in one go. */
  const sendDrafts = () => {
    const stamp = new Date().toISOString();
    let next: Record<string, AssetReview> = assets;
    const sent: string[] = [];
    for (const slot of picked) {
      const drafts = [...assetDrafts(next[slot])];
      const last = drafts[drafts.length - 1] ?? {};
      if (!last.url || last.sentAt) continue;
      drafts[drafts.length - 1] = { ...last, sentAt: stamp };
      next = writeDrafts(slot, drafts, next);
      sent.push(slot);
    }
    if (!sent.length) return;
    void notifyAssetsSubmitted(client, sent, task.title);
    setPicked([]);
  };

  /** We send every review we have written back in one go. */
  const sendReviews = () => {
    const stamp = new Date().toISOString();
    let next: Record<string, AssetReview> = assets;
    const approved: string[] = [];
    const revisions: string[] = [];
    for (const slot of picked) {
      const drafts = [...assetDrafts(next[slot])];
      const index = drafts.length - 1;
      const last = drafts[index] ?? {};
      if (!last.review || last.reviewSentAt) continue;
      drafts[index] = { ...last, reviewSentAt: stamp };
      // Changes needed: a fresh draft slot opens underneath for them.
      if (last.review === "revision") drafts.push({});
      next = writeDrafts(slot, drafts, next);
      if (last.review === "approved") {
        approved.push(slot);
        void mirrorFinalDeliverable(
          client.id,
          `${editing ? "Final edit" : "Final recording"} — ${slot}`,
          last.url ?? "",
        );
      } else {
        revisions.push(slot);
      }
    }
    if (!approved.length && !revisions.length) return;
    void notifyAssetsReviewed(client, approved, revisions);
    void logAudit(
      "asset_review_sent",
      client.name,
      `${task.title}: approved ${approved.join(", ") || "none"}; changes ${revisions.join(", ") || "none"}`,
    );
    setPicked([]);
  };

  const readyToSend = picked.length > 0;

  return (
    <div className="mt-3 space-y-3">
      {ASSET_SLOTS.map((slot) => {
        const asset: AssetReview = assets[slot] ?? {};
        const drafts = assetDrafts(asset);
        const approved = assetApproved(asset);
        const last = latestAssetDraft(asset);
        const awaiting = Boolean(last.sentAt) && !last.review;

        return (
          <div
            key={slot}
            className={cn(
              "rounded-lg border p-3",
              approved ? "border-success/60 bg-success/5" : "border-border bg-muted/30",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {slot}
                {drafts.length > 1 && (
                  <span className="ml-1.5 text-primary">draft {drafts.length}</span>
                )}
              </p>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  approved && "text-success",
                  !approved && awaiting && "text-warning",
                  !approved && !awaiting && "text-muted-foreground",
                )}
              >
                {approved
                  ? "Approved"
                  : awaiting
                    ? "Awaiting review"
                    : last.review === "revision"
                      ? "Changes needed"
                      : "Not sent yet"}
              </span>
            </div>

            <div className="mt-2 space-y-3">
              {drafts.map((draft, index) => {
                const isLast = index === drafts.length - 1;
                const clientCanEdit = readOnly && !locked && isLast && !draft.sentAt;
                const teamCanReview =
                  !readOnly && !locked && isLast && Boolean(draft.sentAt) && !draft.reviewSentAt;

                return (
                  <div key={index} className="rounded-md border border-border bg-background/50 p-3">
                    <label className="block text-[11px] text-muted-foreground">
                      {draftLabel(index)}
                      <Input
                        key={`u-${slot}-${index}-${draft.url ?? ""}`}
                        defaultValue={draft.url ?? ""}
                        readOnly={!clientCanEdit && (readOnly || Boolean(draft.sentAt) || locked)}
                        placeholder="Google Drive or Dropbox link"
                        onBlur={(event) => {
                          if ((draft.url ?? "") === event.target.value) return;
                          setLatest(slot, { url: event.target.value });
                        }}
                        className="mt-1 h-9 bg-background text-sm"
                      />
                    </label>
                    <label className="mt-2 block text-[11px] text-muted-foreground">
                      Notes / thoughts
                      <Textarea
                        key={`dn-${slot}-${index}-${draft.note ?? ""}`}
                        defaultValue={draft.note ?? ""}
                        readOnly={!clientCanEdit && (readOnly || Boolean(draft.sentAt) || locked)}
                        rows={2}
                        placeholder="Anything you want us to know about this version"
                        onBlur={(event) => {
                          if ((draft.note ?? "") === event.target.value) return;
                          setLatest(slot, { note: event.target.value });
                        }}
                        className="mt-1 bg-background text-xs"
                      />
                    </label>

                    {teamCanReview && (
                      <div className="mt-3 space-y-2 border-t border-border pt-2">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={draft.review === "approved" ? "default" : "outline"}
                            onClick={() => setLatest(slot, { review: "approved" })}
                          >
                            <Check className="size-3.5" /> Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={draft.review === "revision" ? "default" : "outline"}
                            onClick={() => setLatest(slot, { review: "revision" })}
                          >
                            <PencilLine className="size-3.5" /> Needs changes
                          </Button>
                        </div>
                        {draft.review === "revision" && (
                          <Textarea
                            key={`rn-${slot}-${index}-${draft.reviewNote ?? ""}`}
                            defaultValue={draft.reviewNote ?? ""}
                            rows={2}
                            placeholder="What needs changing"
                            onBlur={(event) => {
                              if ((draft.reviewNote ?? "") === event.target.value) return;
                              setLatest(slot, { reviewNote: event.target.value });
                            }}
                            className="bg-background text-xs"
                          />
                        )}
                      </div>
                    )}

                    {draft.reviewSentAt && draft.review === "revision" && draft.reviewNote && (
                      <p className="mt-2 rounded-md bg-warning/10 p-2 text-xs text-warning">
                        {draft.reviewNote}
                      </p>
                    )}
                    {draft.reviewSentAt && draft.review === "approved" && (
                      <p className="mt-2 text-[11px] font-semibold text-success">
                        Approved — saved to key links and documents.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {!approved && (
              <label className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={picked.includes(slot)}
                  disabled={
                    locked ||
                    (readOnly ? Boolean(last.sentAt) || !last.url : !last.sentAt || !last.review)
                  }
                  onChange={(event) =>
                    setPicked((list) =>
                      event.target.checked ? [...list, slot] : list.filter((item) => item !== slot),
                    )
                  }
                />
                {readOnly ? "Send this to the team" : "Include in the review I send back"}
              </label>
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
        <Button
          type="button"
          size="sm"
          disabled={!readyToSend || locked}
          onClick={readOnly ? sendDrafts : sendReviews}
        >
          <Send className="size-3.5" />
          {readOnly ? "Send to the team" : "Send review to the client"}
          {picked.length ? ` (${picked.length})` : ""}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Tick everything that is ready — it all goes over as one notification.
        </p>
      </div>
    </div>
  );
}
