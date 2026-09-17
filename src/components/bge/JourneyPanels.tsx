import { useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TEAM, type Client } from "@/lib/bge";
import { DIFFICULTY, HEALTH, formatDate, healthMeta, type IssueRow } from "@/lib/journey";
import {
  useAddStrategy,
  useApprovals,
  useDeliveries,
  useInviteMutations,
  useInvites,
  useIssueMutations,
  useIssues,
  useRequestMutations,
  useRequests,
  useStrategy,
  useUploads,
} from "@/lib/journey-queries";
import { logAudit, useUpdateClient } from "@/lib/queries";
import { EmptyState, FieldLabel } from "@/components/bge/atoms";

function Row({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md border border-border px-2.5 py-2 text-[12px]">
      {children}
    </li>
  );
}

export function HealthPanel({ client }: { client: Client }) {
  const update = useUpdateClient();
  const save = (patch: Partial<Client>) => update.mutate({ id: client.id, patch });
  const meta = healthMeta(client.health);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div>
        <FieldLabel>Health (internal only)</FieldLabel>
        <select
          value={client.health ?? "green"}
          onChange={(e) => {
            save({ health: e.target.value });
            void logAudit("health_set", client.name, e.target.value);
          }}
          className="h-9 w-full rounded-md border border-input bg-card px-2 text-[13px]"
          style={{ color: meta.colour }}
        >
          {HEALTH.map((h) => (
            <option key={h.key} value={h.key}>
              {h.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel>How demanding</FieldLabel>
        <select
          value={client.difficulty ?? ""}
          onChange={(e) => save({ difficulty: e.target.value || null })}
          className="h-9 w-full rounded-md border border-input bg-card px-2 text-[13px]"
        >
          <option value="">Not set</option>
          {DIFFICULTY.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel>Journey start</FieldLabel>
        <Input
          type="date"
          value={client.journey_start ?? ""}
          onChange={(e) => save({ journey_start: e.target.value || null })}
          className="h-9 bg-card"
        />
      </div>
      <div className="sm:col-span-3">
        <FieldLabel>General feel (internal only)</FieldLabel>
        <Textarea
          defaultValue={client.feel_note ?? ""}
          placeholder="How does this relationship actually feel right now?"
          onBlur={(e) => save({ feel_note: e.target.value || null })}
          className="min-h-16 bg-card"
        />
      </div>
    </div>
  );
}

export function StrategyPanel({ client }: { client: Client }) {
  const { data: versions } = useStrategy(client.id);
  const add = useAddStrategy();
  const [content, setContent] = useState("");
  const [price, setPrice] = useState("");
  const [deliverables, setDeliverables] = useState("");

  const nextVersion = (versions?.[0]?.version ?? 0) + 1;

  const submit = () => {
    if (!content.trim()) {
      toast.error("Write the strategy first.");
      return;
    }
    add.mutate(
      {
        client_id: client.id,
        version: nextVersion,
        content: content.trim(),
        price_point: price || null,
        deliverables: deliverables || null,
      },
      {
        onSuccess: () => {
          setContent("");
          setPrice("");
          setDeliverables("");
          void logAudit("strategy_saved", client.name, `Version ${nextVersion}`);
          toast.success(`Saved as version ${nextVersion}.`);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-md border border-border p-3">
        <p className="text-[12px] font-semibold">New version (v{nextVersion})</p>
        <Textarea
          value={content}
          placeholder="Offer, positioning, funnel and the plan William signed off"
          onChange={(e) => setContent(e.target.value)}
          className="min-h-28 bg-card"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={price}
            placeholder="Price point"
            onChange={(e) => setPrice(e.target.value)}
            className="h-9 bg-card"
          />
          <Input
            value={deliverables}
            placeholder="What's included"
            onChange={(e) => setDeliverables(e.target.value)}
            className="h-9 bg-card"
          />
        </div>
        <Button size="sm" onClick={submit}>
          Save version
        </Button>
      </div>

      {(versions ?? []).length === 0 ? (
        <EmptyState>No strategy saved yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {(versions ?? []).map((v) => (
            <li key={v.id} className="rounded-md border border-border p-3">
              <div className="mb-1 flex items-center gap-2 text-[12px] text-muted-foreground">
                <span className="num font-semibold text-foreground">v{v.version}</span>
                <span>{formatDate(v.created_at)}</span>
                {v.price_point && <span>· {v.price_point}</span>}
              </div>
              <p className="whitespace-pre-wrap text-[13px]">{v.content}</p>
              {v.deliverables && (
                <p className="mt-1 text-[12px] text-muted-foreground">{v.deliverables}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IssueLine({ issue, clientName }: { issue: IssueRow; clientName: string }) {
  const { update, remove } = useIssueMutations();
  return (
    <Row>
      <select
        value={issue.severity}
        onChange={(e) => update.mutate({ id: issue.id, patch: { severity: e.target.value } })}
        className="h-8 rounded-md border border-input bg-card px-1.5 text-[12px]"
      >
        {HEALTH.map((h) => (
          <option key={h.key} value={h.key}>
            {h.label}
          </option>
        ))}
      </select>
      <span className="min-w-0 flex-1">
        <span className="font-medium">{issue.title}</span>
        {issue.resolution && (
          <span className="block text-muted-foreground">Fix: {issue.resolution}</span>
        )}
      </span>
      <Input
        defaultValue={issue.resolution ?? ""}
        placeholder="What fixed it"
        onBlur={(e) => update.mutate({ id: issue.id, patch: { resolution: e.target.value } })}
        className="h-8 w-40 bg-card text-[12px]"
      />
      <label className="flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={issue.resolved}
          onChange={(e) => {
            update.mutate({ id: issue.id, patch: { resolved: e.target.checked } });
            if (e.target.checked) void logAudit("issue_resolved", clientName, issue.title);
          }}
        />
        Resolved
      </label>
      <button
        onClick={() => remove.mutate(issue.id)}
        className="text-muted-foreground hover:text-destructive"
        aria-label="Remove issue"
      >
        <Trash2 className="size-3.5" />
      </button>
    </Row>
  );
}

export function IssuesPanel({ client }: { client: Client }) {
  const { data: issues } = useIssues(client.id);
  const { add } = useIssueMutations();
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("amber");
  const [owner, setOwner] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    add.mutate(
      { client_id: client.id, title: title.trim(), severity, owner: owner || null },
      {
        onSuccess: () => {
          setTitle("");
          void logAudit("issue_raised", client.name, title.trim());
          if (severity === "red") {
            void notifyEscalation(client.name, title.trim());
          }
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <FieldLabel>Issue</FieldLabel>
          <Input
            value={title}
            placeholder="What's gone wrong"
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 bg-card"
          />
        </div>
        <div className="w-[160px]">
          <FieldLabel>Severity</FieldLabel>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-card px-2 text-[13px]"
          >
            {HEALTH.map((h) => (
              <option key={h.key} value={h.key}>
                {h.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-[150px]">
          <FieldLabel>Owner</FieldLabel>
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-card px-2 text-[13px]"
          >
            <option value="">Not set</option>
            {TEAM.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={submit}>
          <Plus className="mr-1 size-3.5" /> Add
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Anything marked at risk is escalated to Drilon, then William. Refunds and timeline
        extensions need William&apos;s sign-off.
      </p>
      {(issues ?? []).length === 0 ? (
        <EmptyState>No issues logged.</EmptyState>
      ) : (
        <ul className="space-y-1.5">
          {(issues ?? []).map((issue) => (
            <IssueLine key={issue.id} issue={issue} clientName={client.name} />
          ))}
        </ul>
      )}
    </div>
  );
}

async function notifyEscalation(clientName: string, title: string) {
  const { notify } = await import("@/lib/journey-queries");
  await notify({
    audience: "team",
    kind: "escalation",
    title: `Escalation — ${clientName}`,
    body: `${title} — Drilon to review, then William.`,
  });
}

export function RequestsPanel({ client }: { client: Client }) {
  const { data: requests } = useRequests(client.id);
  const { update } = useRequestMutations();

  if ((requests ?? []).length === 0) return <EmptyState>No client requests.</EmptyState>;

  return (
    <ul className="space-y-1.5">
      {(requests ?? []).map((r) => (
        <Row key={r.id}>
          <span className="min-w-0 flex-1">
            <span className="font-medium">{r.title}</span>
            {r.detail && <span className="block text-muted-foreground">{r.detail}</span>}
            {r.suggested_owner && (
              <span className="block text-muted-foreground">Suggested: {r.suggested_owner}</span>
            )}
          </span>
          {r.loom_url && (
            <a
              href={r.loom_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Loom <ExternalLink className="size-3" />
            </a>
          )}
          <select
            value={r.status}
            onChange={(e) => update.mutate({ id: r.id, patch: { status: e.target.value } })}
            className="h-8 rounded-md border border-input bg-card px-1.5 text-[12px]"
          >
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
            <option value="declined">Declined</option>
          </select>
          <span className="num text-muted-foreground">{formatDate(r.created_at)}</span>
        </Row>
      ))}
    </ul>
  );
}

export function ApprovalPanel({ client }: { client: Client }) {
  const { data: approvals } = useApprovals(client.id);
  const { data: deliveries } = useDeliveries(client.id);
  const { data: uploads } = useUploads(client.id);
  const update = useUpdateClient();

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={client.copy_ready}
          onChange={(e) => {
            update.mutate({ id: client.id, patch: { copy_ready: e.target.checked } });
            void logAudit("copy_ready", client.name, e.target.checked ? "Ready" : "Not ready");
          }}
        />
        All of the copy is ready now — show the approval tick in the client portal
      </label>

      <div>
        <p className="mb-1.5 text-[12px] font-semibold">Client decisions</p>
        {(approvals ?? []).length === 0 ? (
          <EmptyState>Nothing approved yet.</EmptyState>
        ) : (
          <ul className="space-y-1.5">
            {(approvals ?? []).map((a) => (
              <Row key={a.id}>
                <span
                  className="font-semibold"
                  style={{
                    color: a.decision === "approved" ? "var(--success)" : "var(--warning)",
                  }}
                >
                  {a.decision === "approved" ? "All good" : "Editing needed"}
                </span>
                <span className="min-w-0 flex-1">{a.note}</span>
                <span className="num text-muted-foreground">{formatDate(a.created_at)}</span>
              </Row>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-[12px] font-semibold">Delivery log</p>
        {(deliveries ?? []).length === 0 ? (
          <EmptyState>Nothing sent yet.</EmptyState>
        ) : (
          <ul className="space-y-1.5">
            {(deliveries ?? []).map((d) => (
              <Row key={d.id}>
                <span className="min-w-0 flex-1">{d.label}</span>
                <span
                  className="font-semibold"
                  style={{ color: d.on_time ? "var(--success)" : "var(--warning)" }}
                >
                  {d.on_time ? "On time" : "Late"}
                </span>
                <span className="num text-muted-foreground">{formatDate(d.sent_at)}</span>
              </Row>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-[12px] font-semibold">Files the client sent in</p>
        {(uploads ?? []).filter((u) => u.by_client).length === 0 ? (
          <EmptyState>Nothing from the client yet.</EmptyState>
        ) : (
          <ul className="space-y-1.5">
            {(uploads ?? [])
              .filter((u) => u.by_client)
              .map((u) => (
                <Row key={u.id}>
                  <span className="min-w-0 flex-1">{u.label}</span>
                  <a
                    href={u.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Open <ExternalLink className="size-3" />
                  </a>
                  <span className="num text-muted-foreground">{formatDate(u.created_at)}</span>
                </Row>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function PortalAccessPanel({ client }: { client: Client }) {
  const { data: invites } = useInvites(client.id);
  const { add, remove } = useInviteMutations();
  const [email, setEmail] = useState("");

  const submit = () => {
    const value = email.trim().toLowerCase();
    if (!value.includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }
    add.mutate(
      { client_id: client.id, email: value },
      {
        onSuccess: () => {
          setEmail("");
          void logAudit("portal_invite", client.name, value);
          toast.success("They can now create a login with that email.");
        },
        onError: () => toast.error("That email is already invited."),
      },
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted-foreground">
        Add the client&apos;s email, then ask them to sign up on the login page with it. They will
        only ever see their own roadmap — never internal notes, health or other clients.
      </p>
      <div className="flex gap-2">
        <Input
          value={email}
          placeholder="client@theircompany.com"
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="h-9 bg-card"
        />
        <Button size="sm" onClick={submit}>
          Give access
        </Button>
      </div>
      {client.portal_email && (
        <p className="text-[12px] font-semibold text-success">Signed in as {client.portal_email}</p>
      )}
      {(invites ?? []).length === 0 ? (
        <EmptyState>No logins invited yet.</EmptyState>
      ) : (
        <ul className="space-y-1.5">
          {(invites ?? []).map((i) => (
            <Row key={i.id}>
              <span className="min-w-0 flex-1">{i.email}</span>
              <span className="text-muted-foreground">
                {i.claimed ? "Login created" : "Invited"}
              </span>
              <button
                onClick={() => remove.mutate(i.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove invite"
              >
                <Trash2 className="size-3.5" />
              </button>
            </Row>
          ))}
        </ul>
      )}
    </div>
  );
}
