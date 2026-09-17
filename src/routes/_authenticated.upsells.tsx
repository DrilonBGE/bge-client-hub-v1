import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";

import { useShowMore, ShowMoreButton } from "@/components/bge/ShowMore";
import { AppShell } from "@/components/bge/AppShell";
import { useBoard } from "@/components/bge/client-modal-context";
import { EmptyState, SectionCard } from "@/components/bge/atoms";
import { LinkLibrary } from "@/components/bge/LinkLibrary";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useClients, useUpdateClient } from "@/lib/queries";
import { useTasks } from "@/lib/journey-queries";
import { formatDate } from "@/lib/journey";
import { readPayload } from "@/lib/journey-steps";
import { UPSELL_PRICES, currency } from "@/lib/bge";

export const Route = createFileRoute("/_authenticated/upsells")({
  head: () => ({
    meta: [
      { title: "Upsells — BGE Client Journey Board" },
      {
        name: "description",
        content: "Client by client: tier, Amalor, SpeakScript Scale and Commas with notes.",
      },
      { property: "og:title", content: "Upsells — BGE Client Journey Board" },
      {
        property: "og:description",
        content: "Client by client tier, Amalor, SpeakScript Scale and Commas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UpsellsPage,
});

const COLUMNS = [
  {
    key: "amalor",
    note: "amalor_note",
    clientNote: "amalor_client_note",
    label: "Amalor",
    price: UPSELL_PRICES.amalor,
  },
  {
    key: "sss",
    note: "sss_note",
    clientNote: "sss_client_note",
    label: "SpeakScript Scale",
    price: UPSELL_PRICES.sss,
  },
  {
    key: "commas",
    note: "commas_note",
    clientNote: "commas_client_note",
    label: "Commas",
    price: 0,
  },
] as const;

/** Which upsell column a roadmap sign-up step belongs to. */
function signUpField(stepKey: string | null): "amalor" | "sss" | "commas" | null {
  const key = stepKey ?? "";
  if (key.includes("amalor")) return "amalor";
  if (key.includes("speakscript")) return "sss";
  if (key.includes("commas")) return "commas";
  return null;
}

type SignUpAnswer = { taken?: boolean; reason?: string; using?: string; answeredAt?: string };

/** What the client answered on their roadmap, per client and per product. */
function useSignUpAnswers() {
  const { data: tasks = [] } = useTasks();
  return useMemo(() => {
    const map = new Map<string, SignUpAnswer>();
    for (const task of tasks) {
      const field = signUpField(task.step_key);
      if (!field) continue;
      const answer = readPayload(task).signUp;
      if (!answer?.answeredAt) continue;
      const id = `${task.client_id}:${field}`;
      const existing = map.get(id);
      if (!existing || (existing.answeredAt ?? "") < answer.answeredAt) map.set(id, answer);
    }
    return map;
  }, [tasks]);
}

/** The client's own words: why they declined, and what they use instead. */
function ClientReason({
  answer,
  fallback,
}: {
  answer: SignUpAnswer | undefined;
  fallback: string;
}) {
  const reason = (answer?.reason ?? "").trim();
  const using = (answer?.using ?? "").trim();

  if (answer?.taken) {
    return <span className="text-[12px] text-success">Signed up</span>;
  }

  if (!reason && !using) {
    return (
      <span className="block max-w-52 truncate text-[12px] text-muted-foreground" title={fallback}>
        {fallback || "—"}
      </span>
    );
  }

  return (
    <div className="max-w-52 space-y-0.5 text-[12px]" title={[reason, using].join(" · ")}>
      {reason && (
        <p className="text-foreground">
          <span className="text-muted-foreground">Reason: </span>
          {reason}
        </p>
      )}
      {using && (
        <p className="text-muted-foreground">
          <span className="text-muted-foreground">Using instead: </span>
          <span className="text-foreground">{using}</span>
        </p>
      )}
    </div>
  );
}

function Toggle({ value, onChange }: { value: string | null; onChange: (value: string) => void }) {
  const on = value === "Yes";
  return (
    <button
      onClick={() => onChange(on ? "No" : "Yes")}
      className={cn(
        "w-14 rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase transition-colors",
        on
          ? "border-success/50 bg-success/15 text-success"
          : "border-border text-muted-foreground hover:border-primary hover:text-primary",
      )}
    >
      {on ? "Yes" : "No"}
    </button>
  );
}


function UpsellsPage() {
  const { sync, openClient } = useBoard();
  const { data: clients } = useClients();
  const update = useUpdateClient();
  const [query, setQuery] = useState("");
  const answers = useSignUpAnswers();

  const rows = useMemo(() => {
    const active = (clients ?? []).filter((c) => !c.ex_client);
    const q = query.trim().toLowerCase();
    return q ? active.filter((c) => c.name.toLowerCase().includes(q)) : active;
  }, [clients, query]);

  const potential = useMemo(
    () =>
      rows.filter((c) => c.amalor !== "Yes").length * UPSELL_PRICES.amalor +
      rows.filter((c) => c.sss !== "Yes").length * UPSELL_PRICES.sss,
    [rows],
  );

  const list = useShowMore(rows, 5);

  return (
    <AppShell
      title="Upsells / Subscriptions"
      subtitle={`${rows.length} clients · ${currency(potential)}/mo still on the table`}
      sync={sync}
    >
      <div className="space-y-4">
        <LinkLibrary
          category="upsell"
          title="Upsell & subscription links"
          hint="Sign-up pages, checkout links and anything the team needs when pitching an upsell."
        />

        <SectionCard
          title="Client by client"
          action={
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search client"
              className="h-7 w-40 rounded-md border border-input bg-card px-2 text-[12px]"
            />
          }
        >
          {rows.length === 0 ? (
            <EmptyState>No clients match that search.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 font-medium">Client</th>
                    <th className="pb-2 font-medium">Tier</th>
                    {COLUMNS.map((column) => (
                      <th key={column.key} className="pb-2 font-medium" colSpan={3}>
                        {column.label}
                        {column.price > 0 && (
                          <span className="ml-1 normal-case text-muted-foreground">
                            £{column.price}/mo
                          </span>
                        )}
                        <span className="ml-1 normal-case text-muted-foreground">
                          · our notes · their reason &amp; what they use instead
                        </span>

                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.shown.map((client) => (
                    <tr key={client.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-2">
                        <button
                          onClick={() => openClient(client.id)}
                          className="font-medium hover:text-primary"
                        >
                          {client.name}
                        </button>
                      </td>
                      <td className="py-2 pr-2">
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                          {client.tier || client.program || "—"}
                        </span>
                      </td>
                      {COLUMNS.map((column) => (
                        <Fragment key={column.key}>
                          <td className="py-2 pr-1.5">
                            <Toggle
                              value={
                                (client[column.key as keyof typeof client] as string | null) ??
                                (column.key === "commas" ? client.fanbasis : null)
                              }
                              onChange={(value) =>
                                update.mutate({ id: client.id, patch: { [column.key]: value } })
                              }
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <Input
                              defaultValue={
                                (client[column.note as keyof typeof client] as string | null) ?? ""
                              }
                              onBlur={(e) =>
                                update.mutate({
                                  id: client.id,
                                  patch: { [column.note]: e.target.value },
                                })
                              }
                              placeholder="Our notes"
                              className="h-8 w-36 bg-card text-[12px]"
                              aria-label={`Our ${column.label} notes for ${client.name}`}
                            />
                          </td>
                          <td className="py-2 pr-3 align-top">
                            <ClientReason
                              answer={answers.get(`${client.id}:${column.key}`)}
                              fallback={
                                (client[column.clientNote as keyof typeof client] as
                                  | string
                                  | null) ?? ""
                              }
                            />
                          </td>

                        </Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <ShowMoreButton
                open={list.open}
                hidden={list.hidden}
                onClick={list.toggle}
                noun="more clients"
              />
            </div>
          )}
        </SectionCard>

        <ClientRoadmapNotes onOpenClient={openClient} />
      </div>
    </AppShell>
  );
}

/** Anything a client has written for us anywhere on their roadmap. */
function ClientRoadmapNotes({ onOpenClient }: { onOpenClient: (id: string) => void }) {
  const { data: clients } = useClients();
  const { data: tasks = [] } = useTasks();
  const names = useMemo(
    () => new Map((clients ?? []).map((client) => [client.id, client.name])),
    [clients],
  );

  const notes = useMemo(
    () =>
      tasks
        .filter((task) => (task.submission_note ?? "").trim().length > 0)
        .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "")),
    [tasks],
  );

  const list = useShowMore(notes, 6);

  return (
    <SectionCard title="What clients have written on their roadmap">
      {notes.length === 0 ? (
        <EmptyState>No client notes yet.</EmptyState>
      ) : (
        <div className="space-y-1.5">
          {list.shown.map((task) => (
            <div key={task.id} className="rounded-md border border-border px-3 py-2 text-[13px]">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onOpenClient(task.client_id)}
                  className="font-medium hover:text-primary"
                >
                  {names.get(task.client_id) ?? "Client"}
                </button>
                <span className="text-[12px] text-muted-foreground">{task.title}</span>
                <span className="num ml-auto text-[11px] text-muted-foreground">
                  {formatDate(task.updated_at)}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{task.submission_note}</p>
            </div>
          ))}
          <ShowMoreButton
            open={list.open}
            hidden={list.hidden}
            onClick={list.toggle}
            noun="more notes"
          />
        </div>
      )}
    </SectionCard>
  );
}
