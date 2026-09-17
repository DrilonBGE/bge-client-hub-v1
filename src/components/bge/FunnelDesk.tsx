import { Check, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { logAudit, useUpdateClient } from "@/lib/queries";
import { mirrorFinalDeliverable } from "@/lib/links";
import {
  FUNNEL_SLOTS,
  notifyLaunchReady,
  readPayload,
  type FunnelSlotState,
  type StepPayload,
} from "@/lib/journey-steps";
import type { TaskRow } from "@/lib/journey";

type FunnelClient = { id: string; name: string; phase?: number };

/**
 * Drilon's final check. Every finished page goes in here, gets approved one by
 * one, and the whole funnel is then signed off to start the launch.
 */
export function FunnelDesk({
  task,
  client,
  readOnly,
  canSignOff,
  save,
  onSignedOff,
}: {
  task: TaskRow;
  client: FunnelClient;
  readOnly: boolean;
  /** Only Drilon can approve pages and sign the funnel off. */
  canSignOff: boolean;
  save: (payload: StepPayload) => void;
  onSignedOff: () => void;
}) {
  const payload = readPayload(task);
  const funnel = payload.funnel ?? {};
  const updateClient = useUpdateClient();

  const setSlot = (name: string, patch: Partial<FunnelSlotState>) =>
    save({ ...payload, funnel: { ...funnel, [name]: { ...(funnel[name] ?? {}), ...patch } } });

  const allApproved = FUNNEL_SLOTS.every((name) => funnel[name]?.approved);

  const signOff = () => {
    save({ ...payload, funnelApproved: true });
    for (const name of FUNNEL_SLOTS) {
      void mirrorFinalDeliverable(client.id, name, funnel[name]?.url ?? "", "bge_funnel");
    }
    updateClient.mutate({
      id: client.id,
      patch: { phase: Math.max(client.phase ?? 3, 4) } as never,
    });
    void notifyLaunchReady(client);
    void logAudit("funnel_signed_off", client.name, "Funnel approved — launch handed to Victor");
    onSignedOff();
  };

  if (readOnly) {
    return (
      <p className="mt-3 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
        Drilon is doing the final review of your whole funnel. You will be told the moment it is
        approved and going live.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Final funnel review · Drilon only
      </p>

      {FUNNEL_SLOTS.map((name, index) => {
        const slot = funnel[name] ?? {};
        return (
          <div
            key={name}
            className={cn(
              "rounded-lg border p-3",
              slot.approved ? "border-success/60 bg-success/5" : "border-border bg-muted/30",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 text-[12px] font-semibold">
                {index + 1}. {name}
              </span>
              <Button
                type="button"
                size="sm"
                variant={slot.approved ? "default" : "outline"}
                disabled={!canSignOff || payload.funnelApproved}
                onClick={() => setSlot(name, { approved: !slot.approved })}
              >
                <Check className="size-3.5" /> {slot.approved ? "Approved" : "Approve"}
              </Button>
            </div>
            <Input
              key={`f-${name}-${slot.url ?? ""}`}
              defaultValue={slot.url ?? ""}
              readOnly={!canSignOff || payload.funnelApproved}
              placeholder="Paste the finished page or set-up link"
              onBlur={(event) => {
                if ((slot.url ?? "") === event.target.value) return;
                setSlot(name, { url: event.target.value });
              }}
              className="mt-2 h-9 bg-background text-sm"
            />
            <Textarea
              key={`fn-${name}-${slot.note ?? ""}`}
              defaultValue={slot.note ?? ""}
              readOnly={!canSignOff || payload.funnelApproved}
              rows={2}
              placeholder="Notes on this page"
              onBlur={(event) => {
                if ((slot.note ?? "") === event.target.value) return;
                setSlot(name, { note: event.target.value });
              }}
              className="mt-2 bg-background text-xs"
            />
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
        <Button
          type="button"
          size="sm"
          disabled={!canSignOff || !allApproved || payload.funnelApproved}
          onClick={signOff}
        >
          <Rocket className="size-3.5" />
          {payload.funnelApproved ? "Signed off" : "Approve everything and hand to Victor"}
        </Button>
        {!canSignOff && (
          <p className="text-[11px] text-muted-foreground">Only Drilon can complete this step.</p>
        )}
      </div>
    </div>
  );
}
