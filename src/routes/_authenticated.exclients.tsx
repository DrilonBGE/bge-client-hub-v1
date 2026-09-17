import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { buildExClientExport, downloadCsv } from "@/lib/export";

import { useShowMore, ShowMoreButton } from "@/components/bge/ShowMore";
import { AppShell } from "@/components/bge/AppShell";
import { useBoard } from "@/components/bge/client-modal-context";
import { EmptyState, ProgramBadge, SectionCard } from "@/components/bge/atoms";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  logAudit,
  useBinClient,
  useClients,
  useDeletedClients,
  useDeleteClient,
  useRestoreClient,
  useUpdateClient,
} from "@/lib/queries";
import { useDeniedSignups, useReopenSignup } from "@/lib/verification";

export const Route = createFileRoute("/_authenticated/exclients")({
  head: () => ({
    meta: [
      { title: "Ex Clients — BGE Client Journey Board" },
      {
        name: "description",
        content: "Archive of past Build, Grow & Exit clients plus a recoverable deleted folder.",
      },
      { property: "og:title", content: "Ex Clients — BGE Client Journey Board" },
      {
        property: "og:description",
        content: "Archive of past clients plus a recoverable deleted folder.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExClientsPage,
});

/** Sign-ups we turned down at portal onboarding. */
function DeniedOnboarding() {
  const { data: denied = [] } = useDeniedSignups();
  const reopen = useReopenSignup();
  if (denied.length === 0) return null;

  return (
    <SectionCard title={`Denied client portal onboarding (${denied.length})`}>
      <ul className="space-y-2">
        {denied.map((signup) => (
          <li
            key={signup.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3"
          >
            <span className="text-sm font-semibold">{signup.name}</span>
            <span className="min-w-0 flex-1 text-[12px] text-muted-foreground">
              {[
                signup.portal_email ?? signup.email,
                signup.first_payment_date ? `first payment ${signup.first_payment_date}` : null,
                signup.denied_reason,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={reopen.isPending}
              onClick={() =>
                reopen.mutate(
                  { signup },
                  {
                    onSuccess: () =>
                      toast.success(`${signup.name} is back in the verification queue`),
                  },
                )
              }
            >
              Put back to verify
            </Button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function ExClientsPage() {
  const { sync, openClient } = useBoard();
  const { data: clients } = useClients();
  const { data: deleted } = useDeletedClients();
  const update = useUpdateClient();
  const bin = useBinClient();
  const restore = useRestoreClient();
  const remove = useDeleteClient();
  const [tab, setTab] = useState<"archive" | "deleted">("archive");
  const [pending, setPending] = useState<{ id: string; name: string } | null>(null);

  const archive = useMemo(
    () =>
      (clients ?? []).filter(
        (c) => c.ex_client && (c as { portal_status?: string | null }).portal_status !== "denied",
      ),
    [clients],
  );
  const binned = deleted ?? [];
  const list = useShowMore(tab === "archive" ? archive : binned, 5);
  const [exporting, setExporting] = useState(false);

  const exportArchive = async () => {
    setExporting(true);
    try {
      const csv = await buildExClientExport(archive);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`bge-ex-clients-${stamp}.csv`, csv);
      toast.success("Spreadsheet downloaded — open it in Excel or Google Sheets");
    } catch {
      toast.error("Could not build that spreadsheet");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell
      title="Ex Clients"
      subtitle={`${archive.length} archived · ${binned.length} in the deleted folder`}
      sync={sync}
    >
      <SectionCard
        title={tab === "archive" ? "Archive" : "Deleted folder"}
        action={
          <div className="flex items-center gap-2">
            {tab === "archive" && (
              <Button
                size="sm"
                variant="outline"
                disabled={exporting || archive.length === 0}
                onClick={() => void exportArchive()}
              >
                <Download className="size-3.5" /> {exporting ? "Building…" : "Export to Excel"}
              </Button>
            )}
            <div className="flex rounded-md border border-border p-0.5">
              {(
                [
                  ["archive", `Archive (${archive.length})`],
                  ["deleted", `Deleted (${binned.length})`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "rounded px-2 py-0.5 text-[11px] font-semibold transition-colors",
                    tab === key ? "ember-fill" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        }
      >
        {(tab === "archive" ? archive : binned).length === 0 ? (
          <EmptyState>
            {tab === "archive" ? "No ex clients yet." : "The deleted folder is empty."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium">Program</th>
                  <th className="pb-2 font-medium">Value</th>
                  <th className="pb-2 font-medium">
                    {tab === "archive" ? "Left on" : "Deleted on"}
                  </th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {list.shown.map((client) => (
                  <tr key={client.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 font-medium">{client.name}</td>
                    <td className="py-2">
                      <ProgramBadge program={client.program} />
                    </td>
                    <td className="num py-2">{client.active ?? "—"}</td>
                    <td className="py-2 text-muted-foreground">
                      {tab === "archive"
                        ? (client.ex_client_date ?? "—")
                        : client.deleted_at
                          ? new Date(client.deleted_at).toLocaleDateString("en-GB")
                          : "—"}
                    </td>
                    <td className="py-2">
                      <div className="flex justify-end gap-1.5">
                        {tab === "archive" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openClient(client.id)}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                update.mutate({
                                  id: client.id,
                                  patch: { ex_client: false, ex_client_date: null },
                                });
                                void logAudit(
                                  "restore_client",
                                  client.name,
                                  "Restored to active board",
                                );
                                toast.success(`${client.name} back on the board`);
                              }}
                            >
                              Reactivate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                bin.mutate(
                                  { id: client.id, name: client.name },
                                  {
                                    onSuccess: () =>
                                      toast.success(`${client.name} moved to the deleted folder`),
                                  },
                                );
                              }}
                            >
                              Delete
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                restore.mutate(
                                  { id: client.id, name: client.name },
                                  {
                                    onSuccess: () => toast.success(`${client.name} restored`),
                                  },
                                )
                              }
                            >
                              Restore
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive text-destructive hover:bg-destructive/10"
                              onClick={() => setPending({ id: client.id, name: client.name })}
                            >
                              Delete forever
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
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

      <div className="mt-4">
        <DeniedOnboarding />
      </div>

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete {pending?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the client and all their tasks, notes, documents and call reviews for
              good. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pending) return;
                remove.mutate(pending, {
                  onSuccess: () => toast.success(`${pending.name} deleted`),
                  onError: () => toast.error("Could not delete this client"),
                });
                setPending(null);
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
