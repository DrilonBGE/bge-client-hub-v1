import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { EmptyState, SectionCard } from "@/components/bge/atoms";
import { ShowMore } from "@/components/bge/ShowMore";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/journey";
import { phaseColour, type PhaseRow } from "@/lib/bge";

type MoveRow = {
  id: string;
  client_id: string;
  client_name: string | null;
  from_phase: number | null;
  to_phase: number;
  created_at: string;
};

function usePhaseMoves() {
  return useQuery({
    queryKey: ["phase_moves"],
    queryFn: async (): Promise<MoveRow[]> => {
      const { data, error } = await supabase
        .from("phase_moves")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as MoveRow[];
    },
    refetchInterval: 60_000,
  });
}

/** Who has just finished a phase and moved into the next one. */
export function PhaseMoves({
  phases,
  onOpenClient,
}: {
  phases: PhaseRow[];
  onOpenClient?: (id: string) => void;
}) {
  const { data: moves = [] } = usePhaseMoves();
  const name = (id: number | null) =>
    phases.find((p) => p.phase_id === id)?.name ?? (id ? `Phase ${id}` : "—");

  return (
    <SectionCard title="Who just moved on">
      {moves.length === 0 ? (
        <EmptyState>Nobody has changed phase yet.</EmptyState>
      ) : (
        <ShowMore
          items={moves}
          limit={4}
          noun="more moves"
          className="space-y-1.5"
          render={(move) => (
            <div
              key={move.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
            >
              <button
                onClick={() => onOpenClient?.(move.client_id)}
                className="text-[13px] font-semibold hover:text-primary"
              >
                {move.client_name ?? "Client"}
              </button>
              <span className="text-[12px] text-muted-foreground">{name(move.from_phase)}</span>
              <ArrowRight className="size-3.5 text-muted-foreground" />
              <span
                className="rounded px-1.5 py-0.5 text-[11px] font-bold text-white"
                style={{ backgroundColor: phaseColour(move.to_phase) }}
              >
                {name(move.to_phase)}
              </span>
              <span className="num ml-auto text-[11px] text-muted-foreground">
                {formatDate(move.created_at)}
              </span>
            </div>
          )}
        />
      )}
    </SectionCard>
  );
}
