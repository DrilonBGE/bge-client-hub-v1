import type { ReactNode } from "react";
import { Eye, Lock } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * One labelled field. Client-facing fields keep the plain card background;
 * internal-only fields sit in a tinted, dashed box so nobody mixes them up.
 */
export function EditRow({
  label,
  internal,
  hint,
  children,
  className,
}: {
  label: string;
  internal?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        internal ? "border-dashed border-border bg-muted/40" : "border-border bg-card",
        className,
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {internal ? (
          <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
            <Lock className="size-2.5" /> Internal
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
            <Eye className="size-2.5" /> Client sees
          </span>
        )}
      </div>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextField({
  value,
  onSave,
  placeholder,
  type = "text",
}: {
  value: string | null | undefined;
  onSave: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <Input
      key={value ?? ""}
      type={type}
      defaultValue={value ?? ""}
      placeholder={placeholder}
      onBlur={(event) => {
        if ((value ?? "") !== event.target.value) onSave(event.target.value);
      }}
      className="h-9 bg-background text-sm"
    />
  );
}

export function LongField({
  value,
  onSave,
  placeholder,
  rows = 3,
}: {
  value: string | null | undefined;
  onSave: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <Textarea
      key={value ?? ""}
      defaultValue={value ?? ""}
      placeholder={placeholder}
      rows={rows}
      onBlur={(event) => {
        if ((value ?? "") !== event.target.value) onSave(event.target.value);
      }}
      className="bg-background text-sm"
    />
  );
}

export function SelectField({
  value,
  options,
  onSave,
  empty = "Not set",
}: {
  value: string | null | undefined;
  options: readonly string[];
  onSave: (value: string) => void;
  empty?: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(event) => onSave(event.target.value)}
      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
    >
      <option value="">{empty}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
