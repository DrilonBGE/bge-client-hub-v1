import { useState } from "react";
import { Check, Clock, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, SectionCard } from "@/components/bge/atoms";
import { ShowMore } from "@/components/bge/ShowMore";
import { useBoard } from "@/components/bge/client-modal-context";
import { PROGRAMS, PROGRAM_LABELS } from "@/lib/bge";
import { formatDate } from "@/lib/journey";
import { usePendingSheetRows, waitingDays, type PendingRow } from "@/lib/sheet-sync";
import {
  sheetSummary,
  suggestSheetRow,
  useDenySignup,
  usePendingSignups,
  useVerifySignup,
  type Signup,
} from "@/lib/verification";

const NO_ROW = "none";

/** What the Active Client Sheet says about the person we think they are. */
function SheetDetails({ row }: { row: PendingRow }) {
  const values = sheetSummary(row);
  const lines: [string, string | null][] = [
    ["Renewal", values.renewal],
    ["Active now", values.active],
    ["Leaving", values.leaving],
    ["Payment method", values.payment],
    ["Programme on the sheet", values.program],
    ["Sheet notes", values.notes],
  ];
  return (
    <dl className="mt-2 grid gap-1 sm:grid-cols-2">
      {lines.map(([label, value]) => (
        <div key={label} className="flex gap-1.5 text-[12px]">
          <dt className="text-muted-foreground">{label}:</dt>
          <dd className="min-w-0 font-medium">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function SignupCard({ signup, rows }: { signup: Signup; rows: PendingRow[] }) {
  const verify = useVerifySignup();
  const deny = useDenySignup();
  const { openClient } = useBoard();

  const suggested = suggestSheetRow(signup.name, rows);
  const [rowId, setRowId] = useState<string>(suggested?.id ?? NO_ROW);
  const [program, setProgram] = useState<string>("DFY");
  const [reason, setReason] = useState("");
  const [denying, setDenying] = useState(false);

  const chosen = rows.find((row) => row.id === rowId) ?? null;
  const waiting = waitingDays(signup.created_at);

  return (
    <li className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:flex-wrap">
        <ShieldCheck className="size-3.5 text-primary" />
        <button
          onClick={() => openClient(signup.id)}
          className="text-sm font-semibold hover:text-primary hover:underline"
        >
          {signup.name}
        </button>
        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
          Pre-verification access
        </span>
        <span className="hidden flex-1 sm:block" />
        <span className="num col-span-2 text-[11px] text-muted-foreground sm:col-span-1">
          {waiting === 0 ? "signed up today" : `waiting ${waiting} day${waiting === 1 ? "" : "s"}`}
        </span>
      </div>

      <p className="text-[12px] text-muted-foreground">
        {[
          signup.portal_email ?? signup.email,
          signup.phone,
          signup.first_payment_date
            ? `first payment ${formatDate(signup.first_payment_date)}`
            : "no payment date given",
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <div className="rounded-lg border border-border bg-background p-2.5">
        <p className="text-[12px]">
          {suggested ? (
            <>
              It could be <span className="font-semibold">{suggested.name}</span> on the Active
              Client Sheet — check it is the right person, or pick someone else.
            </>
          ) : (
            "No matching row on the Active Client Sheet yet."
          )}
        </p>
        <select
          value={rowId}
          onChange={(event) => setRowId(event.target.value)}
          className="mt-2 w-full rounded-md border border-border bg-card px-2 py-1.5 text-[12px]"
        >
          <option value={NO_ROW}>Waiting on the Active Client Sheet update</option>
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
              {row.sheet_row ? ` — sheet row ${row.sheet_row}` : ""}
              {row.id === suggested?.id ? " (suggested)" : ""}
            </option>
          ))}
        </select>

        {chosen ? (
          <SheetDetails row={chosen} />
        ) : (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[12px] text-muted-foreground">
            <Clock className="size-3.5" /> Waiting on Active Client Sheet update
          </p>
        )}
      </div>

      <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
        <label className="text-[12px] text-muted-foreground">Their tier</label>
        <select
          value={program}
          onChange={(event) => setProgram(event.target.value)}
          className="h-9 w-full rounded-md border border-border bg-card px-2 text-[12px] sm:h-8 sm:w-auto"
        >
          {PROGRAMS.map((item) => (
            <option key={item} value={item}>
              {PROGRAM_LABELS[item] ?? item}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          className="w-full bg-primary text-primary-foreground hover:bg-primary-dark sm:w-auto"
          disabled={verify.isPending}
          onClick={() =>
            verify.mutate(
              { signup, program, sheetRow: chosen },
              {
                onSuccess: () =>
                  toast.success(`${signup.name} verified — their whole portal is open`),
                onError: () => toast.error("Could not verify them"),
              },
            )
          }
        >
          <Check className="size-3.5" /> Confirm onboarding
        </Button>
        <Button
          className="w-full sm:w-auto"
          size="sm"
          variant="ghost"
          onClick={() => setDenying((value) => !value)}
        >
          <X className="size-3.5" /> Cancel onboarding
        </Button>
      </div>

      {denying && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2.5">
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why are we denying them?"
            className="h-8 max-w-sm text-[12px]"
          />
          <Button
            size="sm"
            variant="destructive"
            disabled={deny.isPending}
            onClick={() =>
              deny.mutate(
                { signup, reason },
                {
                  onSuccess: () => {
                    toast.success(`${signup.name} moved to denied onboarding`);
                    setDenying(false);
                  },
                  onError: () => toast.error("Could not do that"),
                },
              )
            }
          >
            Deny and archive
          </Button>
        </div>
      )}
    </li>
  );
}

/** The verification queue: everyone who signed up on their own link. */
export function VerifySignups({ hideEmpty = false }: { hideEmpty?: boolean }) {
  const { data: signups = [] } = usePendingSignups();
  const { data: sheetRows = [] } = usePendingSheetRows();
  const rows = sheetRows.filter((row) => row.kind === "new" || row.kind === "link");

  if (hideEmpty && signups.length === 0) return null;

  return (
    <SectionCard
      title={`Verify new portal sign-ups${signups.length ? ` — ${signups.length}` : ""}`}
    >
      {signups.length === 0 ? (
        <EmptyState>
          Nobody waiting. When a client signs up on their personal link they land here with
          pre-verification access until you confirm their tier.
        </EmptyState>
      ) : (
        <ShowMore
          items={signups}
          limit={5}
          noun="more sign-ups"
          render={(signup) => <SignupCard key={signup.id} signup={signup} rows={rows} />}
        />
      )}
    </SectionCard>
  );
}
