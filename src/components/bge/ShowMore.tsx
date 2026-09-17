import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Shows the first few rows of a list and hides the rest behind "show more".
 * Used everywhere so no single list can swallow the page.
 */
export function ShowMore<T>({
  items,
  render,
  limit = 3,
  className,
  noun = "more",
}: {
  items: T[];
  render: (item: T, index: number) => ReactNode;
  limit?: number;
  className?: string;
  noun?: string;
}) {
  const [open, setOpen] = useState(false);
  const hidden = Math.max(0, items.length - limit);
  const visible = open ? items : items.slice(0, limit);

  return (
    <div className={cn("space-y-2", className)}>
      {visible.map((item, index) => render(item, index))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-foreground",
            open && "text-primary",
          )}
        >
          {open ? (
            <>
              <ChevronUp className="size-3.5" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5" /> Show {hidden} {noun}
            </>
          )}
        </button>
      )}
    </div>
  );
}

/** Same principle for tables, where a wrapper element would break the markup. */
export function useShowMore<T>(items: T[], limit = 5) {
  const [open, setOpen] = useState(false);
  return {
    shown: open ? items : items.slice(0, limit),
    hidden: Math.max(0, items.length - limit),
    open,
    toggle: () => setOpen((value) => !value),
  };
}

export function ShowMoreButton({
  open,
  hidden,
  onClick,
  noun = "more",
}: {
  open: boolean;
  hidden: number;
  onClick: () => void;
  noun?: string;
}) {
  if (hidden <= 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-foreground",
        open && "text-primary",
      )}
    >
      {open ? (
        <>
          <ChevronUp className="size-3.5" /> Show less
        </>
      ) : (
        <>
          <ChevronDown className="size-3.5" /> Show {hidden} {noun}
        </>
      )}
    </button>
  );
}
