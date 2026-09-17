import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ExternalLink, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { BgeMark } from "@/components/bge/AppShell";
import { cn } from "@/lib/utils";

import { finishPortalOnboarding } from "@/lib/portal-onboarding.functions";
import { useClientOnboarding, useOnboardingDocs } from "@/lib/portal-onboarding";

/**
 * Step one for every new client: read and confirm the four welcome documents
 * for their programme. It shows on their dashboard the moment they join, and as
 * the very first step of their roadmap, so both places stay in step.
 */
export function PortalOnboarding({
  client,
  preview = false,
  embedded = false,
  onDone,
}: {
  client: { id: string; name?: string | null; program?: string | null; phone?: string | null };
  preview?: boolean;
  /** Sitting inside the dashboard notice or a roadmap step, not a full page. */
  embedded?: boolean;
  onDone?: () => void;
}) {
  const { data: docs = [], isLoading } = useOnboardingDocs(
    client.program,
    preview ? client.id : null,
  );
  const { data: record } = useClientOnboarding(client.id);
  const finish = useServerFn(finishPortalOnboarding);
  const qc = useQueryClient();

  const [name, setName] = useState(client.name ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [agreed, setAgreed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (record?.full_name) setName(record.full_name);
    if (record?.phone) setPhone(record.phone);
    if (record?.agreed?.length) setAgreed(record.agreed);
  }, [record?.full_name, record?.phone, record?.agreed]);

  const toggle = (id: string) =>
    setAgreed((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));

  const allAgreed = docs.length > 0 && docs.every((doc) => agreed.includes(doc.id));
  const canSubmit = allAgreed;
  const alreadyDone = Boolean(record?.completed_at);

  const submit = async () => {
    if (preview) {
      toast.info("This is how the client confirms their welcome documents.");
      return;
    }
    setBusy(true);
    try {
      await finish({ data: { fullName: name, phone, agreed } });
      toast.success("Thank you — a member of the BGE team is now verifying your account");
      await qc.invalidateQueries();
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that — please try again");
    } finally {
      setBusy(false);
    }
  };

  const documents = (
    <section
      className={cn(
        !embedded && "rounded-2xl border border-border bg-card p-5",
        embedded && "space-y-1",
      )}
    >
      {!embedded && <h2 className="text-base font-semibold">Your welcome documents</h2>}
      {alreadyDone ? (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-[13px] font-medium text-success",
            !embedded && "mt-3",
          )}
        >
          <CheckCircle2 className="size-4 shrink-0" /> Welcome documents completed. No further
          confirmation is needed.
        </div>
      ) : (
        <p className={cn("text-[13px] text-muted-foreground", !embedded && "mt-1")}>
          Open each one, read it, then tick to confirm you have read and understood it.
        </p>
      )}

      {!alreadyDone && isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading your documents…</p>
      ) : !alreadyDone && docs.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Your documents are being prepared — we will let you know the moment they are ready.
        </p>
      ) : !alreadyDone ? (
        <ul className="mt-3 space-y-2">
          {docs.map((doc, index) => {
            const ticked = agreed.includes(doc.id);
            return (
              <li
                key={doc.id}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  ticked ? "border-primary/60 bg-primary/5" : "border-border",
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <span className="num mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{doc.title}</p>
                    {doc.description && (
                      <p className="text-[12px] text-muted-foreground">{doc.description}</p>
                    )}
                    {doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
                      >
                        Open the document <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        Link coming from your BGE contact.
                      </p>
                    )}
                  </div>
                  <label className="ml-9 flex items-center gap-2 text-[12px] font-medium sm:ml-0 sm:shrink-0">
                    <input
                      type="checkbox"
                      checked={ticked}
                      onChange={() => toggle(doc.id)}
                      aria-label={`I have read and understood ${doc.title}`}
                    />
                    Read and understood
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!alreadyDone && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            onClick={submit}
            disabled={!canSubmit || busy}
            className="bg-primary text-primary-foreground hover:bg-primary-dark"
          >
            {busy ? "Saving…" : "Confirm I have read and understood"}
          </Button>
          {!canSubmit && (
            <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Lock className="size-3.5" />
              Tick every document to finish this step.
            </p>
          )}
          {canSubmit && !busy && (
            <p className="flex items-center gap-1.5 text-[12px] text-success">
              <CheckCircle2 className="size-3.5" /> A member of the BGE team will verify your
              account.
            </p>
          )}
        </div>
      )}
    </section>
  );

  if (embedded) return documents;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <div className="flex items-center gap-3">
          <BgeMark size={34} />
          <div>
            <h1 className="text-lg font-semibold">Welcome to Build, Grow &amp; Exit</h1>
            <p className="text-[13px] text-muted-foreground">
              Your first step: the four welcome documents.
            </p>
          </div>
        </div>

        {documents}

        <p className="text-center text-[12px] text-muted-foreground">
          Once these are confirmed, a member of the BGE team verifies your account.
        </p>
      </div>
    </div>
  );
}
