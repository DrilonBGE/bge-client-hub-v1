import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/bge/AppShell";
import { SheetInbox } from "@/components/bge/SheetInbox";
import { GroupCallsPanel } from "@/components/bge/GroupCallsPanel";
import { CoursePanel } from "@/components/bge/CoursePanel";
import { useBoard } from "@/components/bge/client-modal-context";
import { EmptyState, FieldLabel, SectionCard } from "@/components/bge/atoms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog, useClients, usePhases, useTeamLinks, useTeamMembers } from "@/lib/queries";
import { NotesCard } from "@/components/bge/NotesCard";
import {
  PROGRAM_KEYS,
  useOnboardingDocMutations,
  useOnboardingDocs,
} from "@/lib/portal-onboarding";
import { DASHBOARD_WIDGETS, useMyPrefs, useUpdatePrefs, widgetOn, widgetOrder } from "@/lib/prefs";
import { useMyName } from "@/lib/journey-queries";
import { PHASE_COLOURS, type PhaseTask } from "@/lib/bge";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BGE Client Journey Board" },
      {
        name: "description",
        content: "Manage team members, phase tasks, the sheet connection and bulk phase moves.",
      },
      { property: "og:title", content: "Settings — BGE Client Journey Board" },
      {
        property: "og:description",
        content: "Team, phase tasks, sheet connection and bulk phase moves.",
      },
    ],
  }),
  component: SettingsPage,
});

const TABS = [
  ["mine", "My Dashboard"],
  ["team", "Team Members"],
  ["phases", "Phase Tasks"],
  ["docs", "Welcome Documents"],
  ["calls", "Weekly Group Calls"],
  ["course", "BGE Course Content"],
  ["sheet", "Google Sheet"],
  ["notes", "Team Notes"],
  ["audit", "Audit Log"],
] as const;

type TabKey = (typeof TABS)[number][0];

function SettingsPage() {
  const { sync } = useBoard();
  const [tab, setTab] = useState<TabKey>("mine");

  return (
    <AppShell title="Settings" subtitle="Board configuration" sync={sync}>
      <div className="space-y-4">
        <div className="flex snap-x gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "shrink-0 snap-start rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors",
                tab === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "mine" && <MyDashboardTab />}
        {tab === "team" && <TeamTab />}
        {tab === "phases" && <PhasesTab />}
        {tab === "docs" && <WelcomeDocsTab />}
        {tab === "calls" && <GroupCallsPanel editable />}
        {tab === "course" && <CoursePanel editable />}
        {tab === "sheet" && <SheetTab />}
        {tab === "notes" && (
          <div className="space-y-4">
            <NotesCard
              noteKey="command_centre_notes"
              title="Command centre notes"
              hint="The same notes as the Important Links page — shared with the whole team."
            />
            <NotesCard
              noteKey="team_notes_general"
              title="General team notes"
              hint="Anything else the team needs written down."
            />
          </div>
        )}
        {tab === "audit" && <AuditTab />}
      </div>
    </AppShell>
  );
}

/** Every person picks what turns up on their own dashboard, and in what order. */
function MyDashboardTab() {
  const { data: prefs } = useMyPrefs();
  const { data: myName } = useMyName();
  const update = useUpdatePrefs();
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  const order = widgetOrder(prefs);

  const setWidget = (key: string, on: boolean) => {
    const widgets = { ...(prefs?.widgets ?? {}), [key]: on };
    update.mutate(
      { widgets },
      {
        onSuccess: () => toast.success("Your dashboard was updated"),
        onError: () => toast.error("Could not save that change"),
      },
    );
  };

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    update.mutate(
      { widget_order: next },
      {
        onSuccess: () => toast.success("New order saved"),
        onError: () => toast.error("Could not save the new order"),
      },
    );
  };

  return (
    <SectionCard title={`My dashboard${myName ? ` — ${myName}` : ""}`}>
      <p className="mb-3 text-[12px] text-muted-foreground">
        Only you see this. Drag the handle to put the panels in the order you want, and switch off
        anything that is not part of your job.
      </p>
      <div className="space-y-1.5">
        {order.map((key, index) => {
          const widget = DASHBOARD_WIDGETS.find((item) => item.key === key);
          if (!widget) return null;
          const on = widgetOn(prefs, widget.key);
          return (
            <div
              key={widget.key}
              draggable
              onDragStart={() => setDragKey(widget.key)}
              onDragEnd={() => {
                setDragKey(null);
                setOverKey(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setOverKey(widget.key);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragKey && dragKey !== widget.key) {
                  move(
                    order.findIndex((item) => item === dragKey),
                    index,
                  );
                }
                setDragKey(null);
                setOverKey(null);
              }}
              className={cn(
                "grid grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-2 rounded-md border border-border bg-card px-2.5 py-2 sm:flex sm:gap-3 sm:px-3",
                dragKey === widget.key && "opacity-50",
                overKey === widget.key && dragKey && dragKey !== widget.key && "border-primary",
              )}
            >
              <span
                className="mt-0.5 cursor-grab text-muted-foreground active:cursor-grabbing"
                aria-hidden
              >
                <GripVertical className="size-4" />
              </span>
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => setWidget(widget.key, e.target.checked)}
                aria-label={widget.label}
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span className="min-w-0">
                <span className="block text-[13px] font-medium">{widget.label}</span>
                <span className="block text-[11px] text-muted-foreground">{widget.hint}</span>
              </span>
              <span className="col-span-3 flex shrink-0 items-center justify-end gap-1 sm:col-span-1 sm:ml-auto">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Move ${widget.label} up`}
                  className="rounded border border-border p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30"
                >
                  <ArrowUp className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={index === order.length - 1}
                  aria-label={`Move ${widget.label} down`}
                  className="rounded border border-border p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30"
                >
                  <ArrowDown className="size-3" />
                </button>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                    on ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {on ? "Showing" : "Hidden"}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <MyPasswordCard />
    </SectionCard>
  );
}

/** Anyone signed in can change their own password here whenever they want. */
function MyPasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (next.length < 6) {
      toast.error("Use at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: next,
        ...(current ? ({ current_password: current } as Record<string, string>) : {}),
      } as never);
      if (error) throw error;
      toast.success("Your password was changed");
      setCurrent("");
      setNext("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change your password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-md border border-border p-3">
      <p className="text-[13px] font-semibold">Change my password</p>
      <p className="mb-2 text-[11px] text-muted-foreground">
        Only for your own login. Nobody else can see this.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <FieldLabel>Current password</FieldLabel>
          <Input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div>
          <FieldLabel>New password</FieldLabel>
          <Input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={() => void save()}
            disabled={busy || !next}
            className="w-full bg-primary text-primary-foreground hover:bg-primary-dark"
          >
            {busy ? "Saving…" : "Save new password"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TeamTab() {
  const { data: members } = useTeamMembers();
  const { data: teamLinks = [] } = useTeamLinks();
  const qc = useQueryClient();

  /** Phone numbers live on the Important links page, so we read them from there. */
  const phoneFor = (name: string | null) =>
    teamLinks.find(
      (row) =>
        row.category === "team" && (row.name ?? "").toLowerCase() === (name ?? "").toLowerCase(),
    )?.phone ?? null;

  const [form, setForm] = useState({
    display_name: "",
    email: "",
    role: "member",
    colour: "#ff2a00",
  });

  const insert = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("team_members").insert({
        display_name: form.display_name,
        email: form.email || null,
        role: form.role,
        colour: form.colour,
        initials: form.display_name.slice(0, 2).toUpperCase(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["team_members"] });
      toast.success("Team member added");
      setForm({ display_name: "", email: "", role: "member", colour: "#ff2a00" });
    },
    onError: () => toast.error("Could not add this team member"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team_members"] }),
  });

  return (
    <SectionCard title="Team members">
      {!members || members.length === 0 ? (
        <EmptyState>No team members added yet.</EmptyState>
      ) : (
        <div className="space-y-1">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
            >
              <span
                className="flex size-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: member.colour }}
              >
                {member.initials ?? "?"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{member.display_name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {[member.email, phoneFor(member.display_name)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">
                {member.role}
              </span>
              <button
                onClick={() => remove.mutate(member.id)}
                className="text-destructive hover:opacity-70"
                aria-label="Remove team member"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        className="mt-3 grid gap-2 sm:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.display_name.trim()) {
            toast.error("Name is required");
            return;
          }
          insert.mutate();
        }}
      >
        <Input
          value={form.display_name}
          onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          placeholder="Name"
          className="h-9"
        />
        <Input
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="Email"
          className="h-9"
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="h-9 rounded-md border border-input bg-card px-2 text-[13px]"
        >
          <option value="member">member</option>
          <option value="admin">admin</option>
        </select>
        <Input
          type="color"
          value={form.colour}
          onChange={(e) => setForm({ ...form, colour: e.target.value })}
          className="h-9 p-1"
        />
        <Button type="submit" variant="outline" className="h-9">
          <Plus className="size-3.5" /> Add
        </Button>
      </form>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Sign-in passwords are handled by the secure login system, so they are never stored here.
      </p>
    </SectionCard>
  );
}

function PhasesTab() {
  const { data: phases } = usePhases();
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const save = useMutation({
    mutationFn: async ({ phaseId, tasks }: { phaseId: number; tasks: PhaseTask[] }) => {
      const { error } = await supabase
        .from("phase_tasks")
        .update({ tasks })
        .eq("phase_id", phaseId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["phases"] });
      toast.success("Phase tasks updated");
    },
    onError: () => toast.error("Could not update the phase"),
  });

  return (
    <div className="space-y-4">
      {(phases ?? []).map((phase) => (
        <SectionCard key={phase.phase_id} title={`${phase.label}: ${phase.name}`}>
          <div className="space-y-1">
            {phase.tasks.map((task, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: PHASE_COLOURS[phase.phase_id] }}
                />
                <p className="flex-1 text-[13px]">{task.t}</p>
                {task.o && <span className="text-[11px] text-muted-foreground">{task.o}</span>}
                <button
                  onClick={() =>
                    save.mutate({
                      phaseId: phase.phase_id,
                      tasks: phase.tasks.filter((_, i) => i !== index),
                    })
                  }
                  className="text-destructive hover:opacity-70"
                  aria-label="Delete task"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const value = (drafts[phase.phase_id] ?? "").trim();
              if (!value) return;
              save.mutate({ phaseId: phase.phase_id, tasks: [...phase.tasks, { t: value }] });
              setDrafts({ ...drafts, [phase.phase_id]: "" });
            }}
          >
            <Input
              value={drafts[phase.phase_id] ?? ""}
              onChange={(e) => setDrafts({ ...drafts, [phase.phase_id]: e.target.value })}
              placeholder="Add a task to this phase"
              className="h-9"
            />
            <Button type="submit" size="sm" variant="outline">
              <Plus className="size-3.5" /> Add
            </Button>
          </form>
        </SectionCard>
      ))}
    </div>
  );
}

function SheetTab() {
  return (
    <>
      <SectionCard title="Active Client Sheet">
        <ol className="list-decimal space-y-1 pl-4 text-[12px] text-muted-foreground">
          <li>
            The sheet stays private. It is read through a token-protected link, and the token is
            held on our server only — it never reaches anyone's browser.
          </li>
          <li>
            The sheet is the way a client enters the board. New names, changed values and names that
            disappear all wait for someone to approve them.
          </li>
          <li>Nothing is ever written back to the sheet.</li>
          <li>
            A sync runs on its own overnight, and anyone can press Sync sheet at any time here or on
            the dashboard.
          </li>
        </ol>
      </SectionCard>
      <SheetInbox />
    </>
  );
}

const AUDIT_LABELS: Record<string, string> = {
  phase_change: "Phase change",
  task_complete: "Task completed",
  ex_client: "Moved to ex clients",
  restore_client: "Client restored",
  client_added: "Client added",
  client_deleted: "Client deleted",
  field_updated: "Field updated",
  client_request_sent: "Client request sent",
  client_request_updated: "Client request updated",
};

function AuditTab() {
  const { data: rows } = useAuditLog();

  return (
    <SectionCard title="Who changed what, and when">
      {!rows || rows.length === 0 ? (
        <EmptyState>Nothing logged yet.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 font-medium">When</th>
                <th className="pb-2 font-medium">Action</th>
                <th className="pb-2 font-medium">Client</th>
                <th className="pb-2 font-medium">Detail</th>
                <th className="pb-2 font-medium">By</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 last:border-0">
                  <td className="num py-2 text-muted-foreground">
                    {new Date(row.created_at).toLocaleString("en-GB")}
                  </td>
                  <td className="py-2 font-medium">
                    {AUDIT_LABELS[row.action ?? ""] ?? row.action}
                  </td>
                  <td className="py-2">{row.client_name ?? "—"}</td>
                  <td className="py-2 text-muted-foreground">{row.detail ?? "—"}</td>
                  <td className="py-2">{row.user_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

/** The welcome documents each package sees on their very first screen. */
function WelcomeDocsTab() {
  const { data: docs = [] } = useOnboardingDocs();
  const { add, update, remove } = useOnboardingDocMutations();
  const [drafts, setDrafts] = useState<Record<string, { title: string; url: string }>>({});

  return (
    <div className="space-y-4">
      {PROGRAM_KEYS.map(({ key, label }) => {
        const list = docs.filter((doc) => doc.program.toLowerCase() === key);
        const draft = drafts[key] ?? { title: "", url: "" };
        return (
          <SectionCard key={key} title={`${label} — welcome documents (${list.length})`}>
            {list.length === 0 ? (
              <EmptyState>No documents for this package yet.</EmptyState>
            ) : (
              <div className="space-y-2">
                {list.map((doc) => (
                  <div key={doc.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-semibold">{doc.title}</p>
                      {doc.hidden && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                          Hidden from clients
                        </span>
                      )}
                      <span className="flex-1" />
                      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={!doc.hidden}
                          onChange={(event) =>
                            update.mutate({
                              id: doc.id,
                              patch: { hidden: !event.target.checked },
                            })
                          }
                        />
                        Show to clients
                      </label>
                      <button
                        onClick={() => {
                          if (!window.confirm(`Delete “${doc.title}”?`)) return;
                          remove.mutate(doc.id, {
                            onSuccess: () => toast.success("Document deleted"),
                            onError: () => toast.error("Could not delete that document"),
                          });
                        }}
                        className="text-destructive hover:opacity-70"
                        aria-label="Delete this document"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    {doc.description && (
                      <p className="text-[12px] text-muted-foreground">{doc.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Input
                        defaultValue={doc.url ?? ""}
                        placeholder="Paste the Google Drive link"
                        className="h-9 max-w-md text-[12px]"
                        onBlur={(event) => {
                          const url = event.target.value.trim();
                          if (url === (doc.url ?? "")) return;
                          update.mutate(
                            { id: doc.id, patch: { url: url || null } },
                            {
                              onSuccess: () => toast.success("Link saved"),
                              onError: () => toast.error("Could not save that link"),
                            },
                          );
                        }}
                      />
                      {doc.url ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[12px] font-semibold text-primary hover:underline"
                        >
                          Open
                        </a>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">No link yet</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form
              className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.title.trim()) {
                  toast.error("Give the document a name");
                  return;
                }
                add.mutate(
                  {
                    program: key,
                    title: draft.title.trim(),
                    url: draft.url.trim() || null,
                    sort_order: list.length,
                  },
                  {
                    onSuccess: () => {
                      setDrafts((prev) => ({ ...prev, [key]: { title: "", url: "" } }));
                      toast.success("Document added");
                    },
                    onError: () => toast.error("Could not add that document"),
                  },
                );
              }}
            >
              <Input
                value={draft.title}
                onChange={(event) =>
                  setDrafts((prev) => ({ ...prev, [key]: { ...draft, title: event.target.value } }))
                }
                placeholder="Document name"
                className="h-9 text-[12px]"
              />
              <Input
                value={draft.url}
                onChange={(event) =>
                  setDrafts((prev) => ({ ...prev, [key]: { ...draft, url: event.target.value } }))
                }
                placeholder="Google Drive link (optional)"
                className="h-9 text-[12px]"
              />
              <Button type="submit" size="sm" variant="outline">
                Add document
              </Button>
            </form>
          </SectionCard>
        );
      })}
    </div>
  );
}
