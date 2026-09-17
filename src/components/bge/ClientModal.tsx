import { useEffect, useState } from "react";
import { ExternalLink, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  CALL_TYPES,
  DOC_TYPES,
  PHASE_COLOURS,
  RESULT_FIELDS,
  SUGGESTED_DOCS,
  TEAM,
  daysUntilLeaving,
  docTypeColour,
  overallProgress,
  phaseProgress,
  taskKey,
  uid,
  type CallReview,
  type Client,
  type ClientDoc,
  type Evidence,
  type PhaseRow,
} from "@/lib/bge";
import { FieldLabel, ProgramBadge } from "@/components/bge/atoms";
import { VisualBoard } from "@/components/bge/VisualBoard";
import { logAudit, useUpdateClient } from "@/lib/queries";
import { Roadmap } from "@/components/bge/Roadmap";
import {
  ApprovalPanel,
  HealthPanel,
  IssuesPanel,
  PortalAccessPanel,
  RequestsPanel,
  StrategyPanel,
} from "@/components/bge/JourneyPanels";
import { AdsPanel, DraftsPanel } from "@/components/bge/ExtraPanels";
import { ClientPortalPreview } from "@/components/bge/ClientPortalPreview";

const TABS = [
  ["overview", "Overview"],
  ["roadmap", "Roadmap"],
  ["tasks", "All Tasks"],
  ["strategy", "Strategy"],
  ["issues", "Health & Issues"],
  ["portal", "Client Portal"],
  ["info", "Info"],
  ["docs", "Documents"],
  ["calls", "1-to-1 Calls"],
  ["results", "Results"],
  ["ads", "Ads Performance"],
  ["drafts", "AI Drafts"],
] as const;

type TabKey = (typeof TABS)[number][0];

function Select({
  value,
  onChange,
  options,
  placeholder = "Not set",
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-input bg-card px-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function AutoField({
  label,
  value,
  onCommit,
  textarea,
  placeholder,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  textarea?: boolean;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => setLocal(value ?? ""), [value]);

  useEffect(() => {
    if ((value ?? "") === local) return;
    const timer = setTimeout(() => onCommit(local), 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {textarea ? (
        <Textarea
          value={local}
          placeholder={placeholder}
          onChange={(e) => setLocal(e.target.value)}
          className="min-h-24 bg-card"
        />
      ) : (
        <Input
          value={local}
          placeholder={placeholder}
          onChange={(e) => setLocal(e.target.value)}
          className="h-9 bg-card"
        />
      )}
    </div>
  );
}

export function ClientModal({
  client,
  phases,
  onClose,
}: {
  client: Client;
  phases: PhaseRow[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [visual, setVisual] = useState(false);
  const update = useUpdateClient();

  const save = (patch: Partial<Client>) => update.mutate({ id: client.id, patch });

  const overall = overallProgress(client, phases);
  const days = daysUntilLeaving(client);
  const soon = days !== null && days >= 0 && days <= 45;
  const phase = phases.find((p) => p.phase_id === client.phase);

  const toggleTask = (phaseId: number, index: number, next: boolean) => {
    const tasks = { ...client.tasks, [taskKey(phaseId, index)]: next };
    save({ tasks });
    if (next) {
      const title = phases.find((p) => p.phase_id === phaseId)?.tasks[index]?.t ?? "task";
      void logAudit("task_complete", client.name, title);
    }
  };

  const changePhase = (phaseId: number) => {
    if (phaseId === client.phase) return;
    save({ phase: phaseId });
    const target = phases.find((p) => p.phase_id === phaseId);
    void logAudit("phase_change", client.name, `Moved to ${target?.label}: ${target?.name}`);
    toast.success(`Moved to ${target?.label}: ${target?.name}`);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !visual) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, visual]);

  if (visual) {
    return (
      <VisualBoard
        client={client}
        phases={phases}
        onBack={() => setVisual(false)}
        onToggleTask={toggleTask}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 sm:items-center sm:p-6">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-4xl flex-col overflow-hidden border border-border bg-card shadow-pop sm:h-[92vh] sm:rounded-xl">
        <header className="shrink-0 border-b border-border px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold">{client.name}</h2>
                {phase && (
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-primary-foreground"
                    style={{ backgroundColor: PHASE_COLOURS[phase.phase_id] }}
                  >
                    {phase.label}: {phase.name}
                  </span>
                )}
                <ProgramBadge program={client.program} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="num">{client.active ?? "—"}</span> · Renews {client.renewal ?? "—"}{" "}
                ·{" "}
                <span className={soon ? "font-semibold text-primary" : ""}>
                  Leaving {client.leaving ?? "—"}
                </span>
              </p>
            </div>
            <Button
              onClick={() => setVisual(true)}
              className="bg-primary text-primary-foreground hover:bg-primary-dark"
              size="sm"
            >
              Visual Board
            </Button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 hover:bg-accent"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-3 flex gap-1 overflow-x-auto">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                  tab === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {tab === "overview" && (
            <OverviewTab
              client={client}
              phases={phases}
              onChangePhase={changePhase}
              overall={overall}
              days={days}
            />
          )}
          {tab === "roadmap" && <Roadmap client={client} phases={phases} />}

          {tab === "strategy" && <StrategyPanel client={client} />}

          {tab === "issues" && (
            <div className="space-y-6">
              <HealthPanel client={client} />
              <IssuesPanel client={client} />
            </div>
          )}

          {tab === "portal" && (
            <div className="space-y-6">
              <ClientPortalPreview client={client} phases={phases} />
              <PortalAccessPanel client={client} />
              <ApprovalPanel client={client} />
              <RequestsPanel client={client} />
            </div>
          )}

          {tab === "tasks" && (
            <TasksTab client={client} phases={phases} onToggle={toggleTask} onSave={save} />
          )}
          {tab === "info" && <InfoTab client={client} onSave={save} />}
          {tab === "docs" && <DocsTab client={client} onSave={save} />}
          {tab === "calls" && <CallsTab client={client} onSave={save} />}
          {tab === "results" && <ResultsTab client={client} onSave={save} />}
          {tab === "ads" && <AdsPanel client={client} />}
          {tab === "drafts" && <DraftsPanel client={client} />}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border px-5 py-3">
          {client.ex_client ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                save({ ex_client: false, ex_client_date: null });
                void logAudit("restore_client", client.name, "Restored to active board");
                toast.success(`${client.name} restored`);
              }}
            >
              Restore client
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => {
                save({ ex_client: true, ex_client_date: new Date().toLocaleDateString("en-GB") });
                void logAudit("ex_client", client.name, "Moved to ex clients");
                toast.success(`${client.name} moved to ex clients`);
                onClose();
              }}
            >
              Ex Client
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <span className="ml-auto text-[11px] text-muted-foreground">
            Changes save automatically
          </span>
        </footer>
      </div>
    </div>
  );
}

/* -------------------------------- overview -------------------------------- */

function OverviewTab({
  client,
  phases,
  onChangePhase,
  overall,
  days,
}: {
  client: Client;
  phases: PhaseRow[];
  onChangePhase: (phase: number) => void;
  overall: { done: number; total: number; pct: number };
  days: number | null;
}) {
  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>Phase</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {phases.map((p) => (
            <button
              key={p.phase_id}
              onClick={() => onChangePhase(p.phase_id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                client.phase === p.phase_id
                  ? "border-primary bg-primary-light text-primary-dark"
                  : "border-border hover:bg-accent",
              )}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: PHASE_COLOURS[p.phase_id] }}
              />
              {p.label}: {p.name}
            </button>
          ))}
        </div>
      </div>

      {client.leaving && (
        <span
          className={cn(
            "inline-flex rounded-md px-2 py-1 text-[11px] font-semibold",
            days !== null && days <= 30
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground",
          )}
        >
          Leaving {client.leaving}
          {days !== null && ` · ${days} days`}
        </span>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Contract value", client.active],
            ["Renewal", client.renewal],
            ["Payment", client.payment],
            ["Program", client.program],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="num text-sm font-semibold">{value || "—"}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-[12px]">
          <span className="font-semibold">Programme completion</span>
          <span className="num text-muted-foreground">
            {overall.done}/{overall.total} tasks · {overall.pct}%
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-cream-dark">
          <div
            className="h-full rounded-full ember-fill"
            style={{ width: `${overall.pct}%`, boxShadow: "0 0 10px var(--glow)" }}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- tasks --------------------------------- */

function TasksTab({
  client,
  phases,
  onToggle,
  onSave,
}: {
  client: Client;
  phases: PhaseRow[];
  onToggle: (phase: number, index: number, next: boolean) => void;
  onSave: (patch: Partial<Client>) => void;
}) {
  const [newTask, setNewTask] = useState("");
  const custom = client.custom_tasks;

  return (
    <div className="space-y-6">
      {phases.map((phase) => {
        const p = phaseProgress(client, phase);
        return (
          <div key={phase.phase_id}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: PHASE_COLOURS[phase.phase_id] }}
              />
              <p
                className="text-[13px] font-semibold"
                style={{ color: PHASE_COLOURS[phase.phase_id] }}
              >
                {phase.label}: {phase.name}
              </p>
              <span className="num text-[11px] text-muted-foreground">
                {p.done}/{p.total}
              </span>
            </div>
            <div className="space-y-1">
              {phase.tasks.map((task, index) => {
                const done = !!client.tasks[taskKey(phase.phase_id, index)];
                return (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2"
                  >
                    <Checkbox
                      checked={done}
                      onCheckedChange={(value) => onToggle(phase.phase_id, index, !!value)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn("text-[13px]", done && "text-muted-foreground line-through")}
                      >
                        {task.t}
                      </p>
                      {task.n && <p className="text-[11px] text-muted-foreground">{task.n}</p>}
                    </div>
                    {task.o && <span className="text-[11px] text-muted-foreground">{task.o}</span>}
                  </div>
                );
              })}
              {phase.tasks.length === 0 && (
                <p className="text-xs text-muted-foreground">No tasks configured for this phase.</p>
              )}
            </div>
          </div>
        );
      })}

      <div>
        <p className="mb-2 text-[13px] font-semibold">Custom tasks</p>
        <div className="space-y-1">
          {custom.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
            >
              <Checkbox
                checked={task.done}
                onCheckedChange={(value) =>
                  onSave({
                    custom_tasks: custom.map((t) =>
                      t.id === task.id ? { ...t, done: !!value } : t,
                    ),
                  })
                }
              />
              <p
                className={cn(
                  "flex-1 text-[13px]",
                  task.done && "text-muted-foreground line-through",
                )}
              >
                {task.t}
              </p>
              <button
                onClick={() => onSave({ custom_tasks: custom.filter((t) => t.id !== task.id) })}
                className="text-destructive hover:opacity-70"
                aria-label="Delete custom task"
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
            if (!newTask.trim()) return;
            onSave({ custom_tasks: [...custom, { id: uid(), t: newTask.trim(), done: false }] });
            setNewTask("");
          }}
        >
          <Input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add custom task"
            className="h-9"
          />
          <Button type="submit" size="sm" variant="outline">
            <Plus className="size-3.5" /> Add
          </Button>
        </form>
      </div>
    </div>
  );
}

/* ----------------------------------- info --------------------------------- */

function InfoTab({ client, onSave }: { client: Client; onSave: (patch: Partial<Client>) => void }) {
  const links = client.web_links;
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <AutoField
          label="Date joined"
          value={client.joined_date ?? ""}
          onCommit={(v) => onSave({ joined_date: v || null })}
          placeholder="2026-05-14"
        />
        <AutoField
          label="Renewal date"
          value={client.renewal ?? ""}
          onCommit={(v) => onSave({ renewal: v })}
        />

        <AutoField
          label="Leaving date"
          value={client.leaving ?? ""}
          onCommit={(v) => onSave({ leaving: v })}
        />
        <div>
          <FieldLabel>Payment method</FieldLabel>
          <Select
            value={client.payment ?? ""}
            onChange={(v) => onSave({ payment: v })}
            options={["Bank Transfer", "Stripe", "Bank Transfer/Stripe"]}
          />
        </div>
        <AutoField
          label="Niche"
          value={client.niche ?? ""}
          onCommit={(v) => onSave({ niche: v })}
        />
        <AutoField
          label="Why did they sign up?"
          value={client.why_signed_up ?? ""}
          onCommit={(v) => onSave({ why_signed_up: v })}
        />
        <AutoField
          label="Last touchpoint"
          value={client.last_touchpoint ?? ""}
          onCommit={(v) => onSave({ last_touchpoint: v })}
        />
        <AutoField
          label="Phone / WhatsApp"
          value={client.phone ?? ""}
          onCommit={(v) => onSave({ phone: v })}
        />
        <AutoField
          label="Email"
          value={client.email ?? ""}
          onCommit={(v) => onSave({ email: v })}
        />
        <div>
          <FieldLabel>Amalor</FieldLabel>
          <Select
            value={client.amalor ?? ""}
            onChange={(v) => onSave({ amalor: v })}
            options={["Yes", "No"]}
          />
        </div>
        <div>
          <FieldLabel>SSS</FieldLabel>
          <Select
            value={client.sss ?? ""}
            onChange={(v) => onSave({ sss: v })}
            options={["Yes", "No"]}
          />
        </div>
        <div>
          <FieldLabel>Fanbasis</FieldLabel>
          <Select
            value={client.fanbasis ?? ""}
            onChange={(v) => onSave({ fanbasis: v })}
            options={["Yes", "No"]}
          />
        </div>
        <div>
          <FieldLabel>VSL writer</FieldLabel>
          <Select
            value={client.vsl_writer ?? ""}
            onChange={(v) => onSave({ vsl_writer: v })}
            options={TEAM}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <AutoField
            label="Funnel website link"
            value={client.funnel_url ?? ""}
            onCommit={(v) => onSave({ funnel_url: v || null })}
            placeholder="https://…"
          />
          {client.funnel_url && (
            <a
              href={client.funnel_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-[11px] font-semibold text-primary underline"
            >
              Open their funnel
            </a>
          )}
        </div>
        <div>
          <AutoField
            label="Google Drive folder"
            value={client.drive_folder_url ?? ""}
            onCommit={(v) => onSave({ drive_folder_url: v || null })}
            placeholder="https://drive.google.com/…"
          />
          {client.drive_folder_url && (
            <a
              href={client.drive_folder_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-[11px] font-semibold text-primary underline"
            >
              Open their folder
            </a>
          )}
        </div>
        <AutoField
          label="Social media handles"
          value={client.socials ?? ""}
          onCommit={(v) => onSave({ socials: v || null })}
          placeholder="@instagram · @tiktok · youtube.com/…"
        />
      </div>

      <div className="rounded-md border border-border p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-primary">
          Internal only · never shown to the client
        </p>
        <AutoField
          label="Business context (written by William)"
          value={client.business_context ?? ""}
          onCommit={(v) => onSave({ business_context: v || null })}
          textarea
          placeholder={
            "Where they are now…\nWhat they have been doing…\nThe offer…\nThe price point…\nThe deliverables…"
          }
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <AutoField
            label="Free extension (days)"
            value={String(client.extension_days ?? 0)}
            onCommit={(v) => onSave({ extension_days: Number(v) || 0 })}
          />
          <AutoField
            label="Approved by"
            value={client.extension_by ?? ""}
            onCommit={(v) => onSave({ extension_by: v || null })}
            placeholder="William"
          />
          <AutoField
            label="Approved on"
            value={client.extension_date ?? ""}
            onCommit={(v) => onSave({ extension_date: v || null })}
            placeholder="2026-05-14"
          />
        </div>
        <div className="mt-3">
          <AutoField
            label="Extension reason"
            value={client.extension_note ?? ""}
            onCommit={(v) => onSave({ extension_note: v || null })}
            textarea
            placeholder="Why the extra time was granted…"
          />
        </div>
      </div>

      <AutoField
        label="Background notes"
        value={client.notes ?? ""}
        onCommit={(v) => onSave({ notes: v })}
        textarea
        placeholder="Anything the team should know…"
      />

      <div>
        <FieldLabel>Key website links</FieldLabel>
        <div className="space-y-1">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
            >
              <span className="flex-1 truncate text-[13px]">{link.label}</span>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:opacity-70"
                aria-label="Open link"
              >
                <ExternalLink className="size-3.5" />
              </a>
              <button
                onClick={() => onSave({ web_links: links.filter((l) => l.id !== link.id) })}
                className="text-destructive hover:opacity-70"
                aria-label="Delete link"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <form
          className="mt-2 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (!label.trim() || !url.trim()) return;
            onSave({ web_links: [...links, { id: uid(), label: label.trim(), url: url.trim() }] });
            setLabel("");
            setUrl("");
          }}
        >
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label"
            className="h-9"
          />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            className="h-9"
          />
          <Button type="submit" size="sm" variant="outline">
            <Plus className="size-3.5" /> Add
          </Button>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------------- docs ---------------------------------- */

function DocsTab({ client, onSave }: { client: Client; onSave: (patch: Partial<Client>) => void }) {
  const docs = client.docs;
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("Link");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const addDoc = (doc: ClientDoc) => {
    onSave({ docs: [...docs, doc] });
    toast.success("Document added");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        {docs.length === 0 && (
          <p className="text-xs text-muted-foreground">No documents attached yet.</p>
        )}
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
          >
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: docTypeColour(doc.type) }}
            >
              {doc.type}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{doc.name}</p>
              {doc.added && <p className="text-[11px] text-muted-foreground">Added {doc.added}</p>}
            </div>
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent"
            >
              Open
            </a>
            <button
              onClick={() => onSave({ docs: docs.filter((d) => d.id !== doc.id) })}
              className="text-destructive hover:opacity-70"
              aria-label="Delete document"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      {open ? (
        <form
          className="space-y-3 rounded-lg border border-border bg-background p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || !url.trim()) {
              toast.error("Name and link are both required");
              return;
            }
            addDoc({
              id: uid(),
              type,
              name: name.trim(),
              url: url.trim(),
              added: new Date().toLocaleDateString("en-GB"),
            });
            setName("");
            setUrl("");
            setOpen(false);
          }}
        >
          <div className="flex flex-wrap gap-1.5">
            {DOC_TYPES.map((docType) => (
              <button
                key={docType}
                type="button"
                onClick={() => setType(docType)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px] font-medium",
                  type === docType
                    ? "border-primary bg-primary-light text-primary-dark"
                    : "border-border",
                )}
              >
                {docType}
              </button>
            ))}
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Document name"
            className="h-9"
          />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            className="h-9"
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary-dark"
            >
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> Add document
        </Button>
      )}

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Suggested documents
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_DOCS.map((suggested) => (
            <button
              key={suggested}
              onClick={() => {
                setOpen(true);
                setName(suggested);
              }}
              className="rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent"
            >
              + {suggested}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- calls --------------------------------- */

function emptyCall(): CallReview {
  return {
    id: uid(),
    type: CALL_TYPES[0],
    date: "",
    who: "",
    drive: "",
    fathom: "",
    notes: "",
    client_tasks: "",
    team_tasks: "",
  };
}

function CallsTab({
  client,
  onSave,
}: {
  client: Client;
  onSave: (patch: Partial<Client>) => void;
}) {
  const calls = client.call_reviews;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CallReview>(emptyCall);

  const set = (patch: Partial<CallReview>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {calls.length === 0 && (
          <p className="text-xs text-muted-foreground">No calls logged yet.</p>
        )}
        {calls.map((call) => (
          <div key={call.id} className="rounded-lg border border-border bg-background p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-semibold">{call.type}</p>
              <span className="text-[11px] text-muted-foreground">
                {call.date} {call.who && `· ${call.who}`}
              </span>
              <div className="ml-auto flex gap-1.5">
                {call.drive && (
                  <a
                    href={call.drive}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent"
                  >
                    Drive
                  </a>
                )}
                {call.fathom && (
                  <a
                    href={call.fathom}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent"
                  >
                    Fathom
                  </a>
                )}
                <button
                  onClick={() => onSave({ call_reviews: calls.filter((c) => c.id !== call.id) })}
                  className="text-destructive hover:opacity-70"
                  aria-label="Delete call review"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
            {call.notes && (
              <p className="mt-1 line-clamp-3 text-[12px] text-light-text">{call.notes}</p>
            )}
          </div>
        ))}
      </div>

      {open ? (
        <form
          className="space-y-3 rounded-lg border border-border bg-background p-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSave({ call_reviews: [{ ...form, id: uid() }, ...calls] });
            toast.success("Call review saved");
            setForm(emptyCall());
            setOpen(false);
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Type of call</FieldLabel>
              <Select value={form.type} onChange={(v) => set({ type: v })} options={CALL_TYPES} />
            </div>
            <div>
              <FieldLabel>Date</FieldLabel>
              <Input
                value={form.date}
                onChange={(e) => set({ date: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <FieldLabel>Who with</FieldLabel>
              <Input
                value={form.who}
                onChange={(e) => set({ who: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <FieldLabel>Google Drive link</FieldLabel>
              <Input
                value={form.drive}
                onChange={(e) => set({ drive: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <FieldLabel>Fathom recording link</FieldLabel>
              <Input
                value={form.fathom}
                onChange={(e) => set({ fathom: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Overall notes</FieldLabel>
            <Textarea
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
              className="min-h-20"
            />
          </div>
          <div>
            <FieldLabel>Tasks for client</FieldLabel>
            <Textarea
              value={form.client_tasks}
              onChange={(e) => set({ client_tasks: e.target.value })}
              className="min-h-16"
            />
          </div>
          <div>
            <FieldLabel>Tasks for executive team</FieldLabel>
            <Textarea
              value={form.team_tasks}
              onChange={(e) => set({ team_tasks: e.target.value })}
              className="min-h-16"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary-dark"
            >
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> Add call review
        </Button>
      )}
    </div>
  );
}

/* --------------------------------- results -------------------------------- */

function ResultsTab({
  client,
  onSave,
}: {
  client: Client;
  onSave: (patch: Partial<Client>) => void;
}) {
  const results = client.results;
  const evidence = (results["evidence"] as Evidence[] | undefined) ?? [];
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const setResult = (key: string, value: string) =>
    onSave({ results: { ...results, [key]: value } });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {RESULT_FIELDS.map((field) => (
          <AutoField
            key={field.key}
            label={field.label}
            value={(results[field.key] as string | undefined) ?? ""}
            onCommit={(value) => setResult(field.key, value)}
          />
        ))}
      </div>

      <AutoField
        label="Monthly notes / highlights"
        value={(results["monthly_notes"] as string | undefined) ?? ""}
        onCommit={(value) => setResult("monthly_notes", value)}
        textarea
      />

      <div>
        <FieldLabel>Evidence (screenshots &amp; documents)</FieldLabel>
        <div className="space-y-1">
          {evidence.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
            >
              <span className="flex-1 truncate text-[13px]">{item.name}</span>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary"
                aria-label="Open evidence"
              >
                <ExternalLink className="size-3.5" />
              </a>
              <button
                onClick={() =>
                  onSave({
                    results: { ...results, evidence: evidence.filter((e) => e.id !== item.id) },
                  })
                }
                className="text-destructive hover:opacity-70"
                aria-label="Delete evidence"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <form
          className="mt-2 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || !url.trim()) return;
            onSave({
              results: {
                ...results,
                evidence: [...evidence, { id: uid(), name: name.trim(), url: url.trim() }],
              },
            });
            setName("");
            setUrl("");
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Label"
            className="h-9"
          />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            className="h-9"
          />
          <Button type="submit" size="sm" variant="outline">
            <Plus className="size-3.5" /> Add
          </Button>
        </form>
      </div>
    </div>
  );
}
