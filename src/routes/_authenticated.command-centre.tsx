import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/bge/AppShell";
import { useBoard } from "@/components/bge/client-modal-context";
import { EmptyState, ProgramBadge, SectionCard } from "@/components/bge/atoms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useClients, useUpdateClient } from "@/lib/queries";
import { PROGRAMS, PROGRAM_LABELS, type Client } from "@/lib/bge";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PORTAL_TABS } from "@/lib/portal-tabs";
import {
  allowed,
  toggleMap,
  useAccessMutations,
  useAllClientAccess,
  useCourse,
} from "@/lib/course";

export const Route = createFileRoute("/_authenticated/command-centre")({
  head: () => ({
    meta: [
      { title: "Command Centre — BGE Client Journey Board" },
      {
        name: "description",
        content:
          "Control which portal sections and course categories each client can see when they log in.",
      },
      { property: "og:title", content: "Command Centre — BGE Client Journey Board" },
      {
        property: "og:description",
        content: "Decide what every client sees inside their own portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommandCentrePage,
});

/**
 * Everything about one client's account in one place: who they are, the email
 * they log in with, a password reset, and which package (and roadmap) they are on.
 */
function ClientAccount({ client }: { client: Client }) {
  const update = useUpdateClient();
  const row = client as Client & { roadmap_program?: string | null; portal_email?: string | null };
  const loginEmail = row.portal_email || client.email || "";

  const [program, setProgram] = useState(client.program ?? "DFY");
  const [roadmap, setRoadmap] = useState(row.roadmap_program ? "keep" : "match");
  const [busy, setBusy] = useState(false);

  const currentRoadmap = row.roadmap_program ?? client.program ?? "DFY";
  const dirty =
    program !== (client.program ?? "DFY") || roadmap !== (row.roadmap_program ? "keep" : "match");

  const savePackage = () => {
    update.mutate(
      {
        id: client.id,
        patch: {
          program,
          roadmap_program: roadmap === "keep" ? currentRoadmap : null,
        } as Partial<Client>,
      },
      {
        onSuccess: () =>
          toast.success(
            roadmap === "keep"
              ? `${client.name} is now ${PROGRAM_LABELS[program] ?? program}, keeping their current roadmap`
              : `${client.name} is now ${PROGRAM_LABELS[program] ?? program}`,
          ),
        onError: () => toast.error("Could not save that change"),
      },
    );
  };

  const resetPassword = async () => {
    if (!loginEmail) {
      toast.error("We do not have an email address for this client yet");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) toast.error("Could not send the reset email");
    else toast.success(`Password reset sent to ${loginEmail}`);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Their account
      </p>
      <div className="grid gap-2 text-[12px] sm:grid-cols-2">
        <p>
          <span className="text-muted-foreground">Name: </span>
          <span className="font-medium">{client.name}</span>
        </p>
        <p className="min-w-0 truncate">
          <span className="text-muted-foreground">Logs in with: </span>
          <span className="font-medium">{loginEmail || "No email yet"}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Phone: </span>
          <span className="font-medium">{client.phone || "—"}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Portal: </span>
          <span className="font-medium">
            {(client as Client & { portal_status?: string | null }).portal_status ?? "verified"}
          </span>
        </p>
      </div>
      <Button size="sm" variant="outline" disabled={busy} onClick={resetPassword}>
        {busy ? "Sending…" : "Send them a password reset"}
      </Button>

      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Their package
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] text-muted-foreground">
            Package
            <select
              value={program}
              onChange={(event) => setProgram(event.target.value)}
              className="mt-1 block h-9 rounded-md border border-input bg-card px-2 text-[12px]"
            >
              {PROGRAMS.map((item) => (
                <option key={item} value={item}>
                  {PROGRAM_LABELS[item] ?? item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-muted-foreground">
            Roadmap
            <select
              value={roadmap}
              onChange={(event) => setRoadmap(event.target.value)}
              className="mt-1 block h-9 rounded-md border border-input bg-card px-2 text-[12px]"
            >
              <option value="match">Use the roadmap for the new package</option>
              <option value="keep">
                Keep their current roadmap ({PROGRAM_LABELS[currentRoadmap] ?? currentRoadmap})
              </option>
            </select>
          </label>
          <Button
            size="sm"
            disabled={!dirty || update.isPending}
            onClick={savePackage}
            className="bg-primary text-primary-foreground hover:bg-primary-dark"
          >
            {update.isPending ? "Saving…" : "Save package change"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Keeping the current roadmap means none of the work already done is lost. Switch back at
          any time and everything is exactly where it was.
        </p>
      </div>
    </div>
  );
}

function CommandCentrePage() {
  const { sync } = useBoard();
  const { data: clients = [] } = useClients();
  const { data: rows = [] } = useAllClientAccess();
  const { data: course = [] } = useCourse();
  const { save } = useAccessMutations();
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const live = clients
    .filter((client) => !client.ex_client)
    .filter((client) => client.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const accessFor = (clientId: string) => rows.find((row) => row.client_id === clientId) ?? null;

  const flip = (
    clientId: string,
    field: "tabs" | "course",
    key: string,
    on: boolean,
    current: Record<string, boolean>,
  ) => {
    save.mutate(
      { clientId, [field]: { ...current, [key]: on } },
      {
        onSuccess: () => toast.success("Access updated"),
        onError: () => toast.error("Could not change that"),
      },
    );
  };

  return (
    <AppShell
      title="Command centre"
      subtitle="What each client can see when they log in"
      sync={sync}
    >
      <div className="space-y-4">
        <SectionCard title="Clients">
          <p className="mb-3 text-[12px] text-muted-foreground">
            Everything is switched on by default. Switch something off and it disappears from that
            client&apos;s portal straight away.
          </p>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search for a client"
            className="mb-3 h-9"
          />
          {!live.length ? (
            <EmptyState>No clients match that search.</EmptyState>
          ) : (
            <div className="space-y-2">
              {live.map((client) => {
                const access = accessFor(client.id);
                const tabMap = toggleMap(access?.tabs);
                const courseMap = toggleMap(access?.course);
                const hiddenTabs = PORTAL_TABS.filter(
                  ([key]) => key !== "dashboard" && !allowed(tabMap, key),
                ).length;
                const isOpen = openId === client.id;

                return (
                  <div key={client.id} className="rounded-lg border border-border">
                    <button
                      onClick={() => setOpenId(isOpen ? null : client.id)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                        {client.name}
                      </span>
                      <ProgramBadge program={client.program} />
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                          hiddenTabs
                            ? "bg-warning/15 text-warning"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {hiddenTabs ? `${hiddenTabs} hidden` : "Full access"}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="space-y-4 border-t border-border p-3">
                        <ClientAccount client={client} />
                        <div>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Portal sections
                          </p>
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {PORTAL_TABS.map(([key, label]) => (
                              <label
                                key={key}
                                className={cn(
                                  "flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-[12px]",
                                  key === "dashboard"
                                    ? "opacity-60"
                                    : "cursor-pointer hover:bg-accent/40",
                                )}
                              >
                                <input
                                  type="checkbox"
                                  disabled={key === "dashboard"}
                                  checked={key === "dashboard" || allowed(tabMap, key)}
                                  onChange={(event) =>
                                    flip(client.id, "tabs", key, event.target.checked, tabMap)
                                  }
                                  className="size-3.5 accent-[var(--primary)]"
                                />
                                {label}
                                {key === "dashboard" && (
                                  <span className="ml-auto text-[10px] text-muted-foreground">
                                    always on
                                  </span>
                                )}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Course content
                          </p>
                          <div className="space-y-2">
                            {course.map((section) => (
                              <div key={section.id} className="rounded-md border border-border p-2">
                                <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium">
                                  <input
                                    type="checkbox"
                                    checked={allowed(courseMap, section.id)}
                                    onChange={(event) =>
                                      flip(
                                        client.id,
                                        "course",
                                        section.id,
                                        event.target.checked,
                                        courseMap,
                                      )
                                    }
                                    className="size-3.5 accent-[var(--primary)]"
                                  />
                                  {section.title}
                                </label>
                                <div className="mt-1.5 grid gap-1 pl-6 sm:grid-cols-2">
                                  {section.modules.map((module) => (
                                    <label
                                      key={module.id}
                                      className="flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={allowed(courseMap, module.id)}
                                        onChange={(event) =>
                                          flip(
                                            client.id,
                                            "course",
                                            module.id,
                                            event.target.checked,
                                            courseMap,
                                          )
                                        }
                                        className="size-3 accent-[var(--primary)]"
                                      />
                                      <span className="truncate">{module.title}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
