import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileSpreadsheet, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { notify, useTasks } from "@/lib/journey-queries";
import { roadmapKind, useSyncPhaseSteps } from "@/lib/journey-steps";
import { phaseStepDates } from "@/lib/task-templates";
import { LINK_GROUPS, findLinkUrl, mirrorDocumentLink } from "@/lib/links";
import { LinkGroupSection } from "@/components/bge/KeyLinksPanel";
import { useUpdateClient } from "@/lib/queries";
import type { Client } from "@/lib/bge";

/** The client's own pages, shared with the key links and documents tab. */
const socialGroup = LINK_GROUPS.find((group) => group.key === "client_web");

/** The fixed YouTube competitor analysis template, shared by every client. */
const templateKey = (kind: string) => `youtube_template_url_${kind}`;

function useTemplateUrl(kind: string) {
  const key = templateKey(kind);
  return useQuery({
    queryKey: ["app_config", key],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      return data?.value ?? "";
    },
  });
}

function useSaveTemplateUrl(kind: string) {
  const qc = useQueryClient();
  const key = templateKey(kind);
  return useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase.from("app_config").upsert({ key, value } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app_config", key] }),
  });
}

function LinkRow({
  label,
  value,
  hint,
  readOnly,
  onSave,
}: {
  label: string;
  value: string | null;
  hint?: string;
  readOnly: boolean;
  onSave: (value: string | null) => void;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-sm font-semibold">{label}</p>
      {hint && <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>}
      {readOnly ? (
        value ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[12px] text-primary"
          >
            <ExternalLink className="size-3.5" /> Open
          </a>
        ) : (
          <p className="mt-2 text-[12px] text-muted-foreground">Nothing added yet.</p>
        )
      ) : (
        <>
          <Input
            key={`${label}-${value ?? ""}`}
            defaultValue={value ?? ""}
            placeholder="Paste the link here"
            onBlur={(event) => {
              if ((value ?? "") === event.target.value) return;
              onSave(event.target.value || null);
            }}
            className="mt-2 h-9 bg-background text-sm"
          />
          {value && (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[12px] text-primary"
            >
              <ExternalLink className="size-3.5" /> Open
            </a>
          )}
        </>
      )}
    </div>
  );
}

/**
 * The content plan. Off by default: Drilon switches it on per client, which
 * also adds the content plan step into Pre-Launch straight away.
 */
export function ContentPlanPanel({
  client,
  clientView = false,
}: {
  client: Client;
  clientView?: boolean;
}) {
  const update = useUpdateClient();
  const { data: tasks = [] } = useTasks(client.id);
  const syncSteps = useSyncPhaseSteps();
  const kind = roadmapKind(client);
  const { data: templateUrl = "" } = useTemplateUrl(kind);
  const saveTemplate = useSaveTemplateUrl(kind);
  const on = Boolean(client.content_plan);
  const save = (patch: Partial<Client>) => update.mutate({ id: client.id, patch });

  // Links live in two places at once: here and under key links and documents.
  const youtubeUrl =
    client.content_youtube_url ?? findLinkUrl(client, "YouTube competitor analysis (completed)");
  const feedbackUrl =
    client.content_feedback_url ?? findLinkUrl(client, "BGE content feedback and strategy");

  const toggle = () => {
    const next = !on;
    update.mutate(
      { id: client.id, patch: { content_plan: next } as Partial<Client> },
      {
        onSuccess: () =>
          syncSteps.mutate({
            client: { ...client, content_plan: next },
            existing: tasks,
            dates: phaseStepDates(client),
          }),
      },
    );
    toast.success(
      next
        ? "Content plan switched on — the task is now on their roadmap."
        : "Content plan switched off and removed from the roadmap.",
    );
  };

  if (clientView && !on) {
    return (
      <p className="text-[12px] text-muted-foreground">
        The content plan is not part of your journey at the moment.
      </p>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Content plan</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            YouTube competitor analysis, our feedback and their own pages.
          </p>
        </div>
        {!clientView && (
          <button
            type="button"
            onClick={toggle}
            className={cn(
              "rounded-md border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors",
              on
                ? "border-success/50 bg-success/15 text-success"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary",
            )}
          >
            {on ? "Content plan on" : "Content plan off"}
          </button>
        )}
      </div>

      {!on ? (
        <p className="text-[12px] text-muted-foreground">
          Switch it on to add the content plan task into Pre-Launch for this client.
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-border p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Lock className="size-3.5 text-muted-foreground" /> YouTube competitor analysis
              template
            </p>
            {templateUrl ? (
              <Button asChild size="sm" variant="ghost" className="mt-2 border border-border">
                <a href={templateUrl} target="_blank" rel="noreferrer">
                  <FileSpreadsheet className="mr-1 size-3.5" /> Open the template
                </a>
              </Button>
            ) : (
              <p className="mt-2 text-[12px] text-muted-foreground">
                {clientView ? "Template link to follow." : "Add the template link below."}
              </p>
            )}
            {!clientView && (
              <Input
                key={`template-${templateUrl}`}
                defaultValue={templateUrl}
                placeholder="https://docs.google.com/spreadsheets/…"
                onBlur={(event) => {
                  if (event.target.value === templateUrl) return;
                  saveTemplate.mutate(event.target.value);
                }}
                className="mt-2 h-9 bg-background text-sm"
              />
            )}
          </div>

          <LinkRow
            label="Completed competitor analysis"
            hint={
              clientView
                ? "Paste the link to your completed sheet — we will be notified straight away."
                : "The client's completed sheet."
            }
            value={youtubeUrl}
            readOnly={false}
            onSave={(content_youtube_url) => {
              save({ content_youtube_url } as Partial<Client>);
              if (content_youtube_url) {
                void mirrorDocumentLink(
                  client.id,
                  "YouTube competitor analysis (completed)",
                  content_youtube_url,
                );
              }
              if (clientView && content_youtube_url) {
                void notify({
                  client_id: client.id,
                  audience: "team",
                  kind: "action",
                  title: `Drilon: ${client.name} has sent their competitor analysis`,
                  body: `/clients/${client.id}`,
                  owner: "Drilon",
                });
              }
            }}
          />

          <LinkRow
            label="BGE feedback and strategy"
            hint="Drilon's feedback on the competitor analysis."
            value={feedbackUrl}
            readOnly={clientView}
            onSave={(content_feedback_url) => {
              save({ content_feedback_url } as Partial<Client>);
              if (content_feedback_url) {
                void mirrorDocumentLink(
                  client.id,
                  "BGE content feedback and strategy",
                  content_feedback_url,
                );
              }
              if (!clientView && content_feedback_url) {
                void notify({
                  client_id: client.id,
                  audience: "client",
                  kind: "info",
                  title: "Your content feedback and strategy is ready",
                  body: "Open your content plan tab to read it.",
                });
              }
            }}
          />

          {/* Exactly the same rows as key links and documents, so anything
              typed in either place shows up in both. */}
          {socialGroup && <LinkGroupSection client={client} group={socialGroup} />}
        </>
      )}
    </div>
  );
}
