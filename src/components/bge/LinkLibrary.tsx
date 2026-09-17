import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, SectionCard } from "@/components/bge/atoms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useTeamLinks } from "@/lib/queries";

/**
 * A simple title + link list, kept apart by category so key websites and
 * upsell links live in their own sections.
 */
export function LinkLibrary({
  category,
  title,
  hint,
}: {
  category: string;
  title: string;
  hint?: string;
}) {
  const { data: all } = useTeamLinks();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", link: "" });

  const rows = (all ?? []).filter((row) => (row.category ?? "team") === category);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["team_links"] });

  const insert = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("team_links").insert({
        name: form.name,
        link: form.link || null,
        category,
        sort_order: rows.length + 1,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setForm({ name: "", link: "" });
      toast.success("Link added");
    },
    onError: () => toast.error("Could not add that link"),
  });

  const patch = useMutation({
    mutationFn: async (input: { id: string; values: Record<string, string> }) => {
      const { error } = await supabase
        .from("team_links")
        .update(input.values as never)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return (
    <SectionCard title={title}>
      {hint && <p className="mb-3 text-[12px] text-muted-foreground">{hint}</p>}

      {rows.length === 0 ? (
        <EmptyState>Nothing added here yet.</EmptyState>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border px-2 py-1.5"
            >
              <Input
                defaultValue={row.name ?? ""}
                onBlur={(e) => patch.mutate({ id: row.id, values: { name: e.target.value } })}
                placeholder="Title"
                className="h-8 w-48 bg-card"
              />
              <Input
                defaultValue={row.link ?? ""}
                onBlur={(e) => patch.mutate({ id: row.id, values: { link: e.target.value } })}
                placeholder="https://"
                className="h-8 min-w-0 flex-1 bg-card"
              />
              {row.link && (
                <a
                  href={row.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary"
                  aria-label={`Open ${row.name ?? "link"}`}
                >
                  <ExternalLink className="size-3.5" />
                </a>
              )}
              <button
                onClick={() => remove.mutate(row.id)}
                className="text-destructive hover:opacity-70"
                aria-label="Delete link"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.name.trim()) {
            toast.error("Give the link a title");
            return;
          }
          insert.mutate();
        }}
      >
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Title"
          className="h-9 w-48"
        />
        <Input
          value={form.link}
          onChange={(e) => setForm({ ...form, link: e.target.value })}
          placeholder="https://"
          className="h-9 min-w-0 flex-1"
        />
        <Button type="submit" variant="outline" className="h-9">
          <Plus className="size-3.5" /> Add
        </Button>
      </form>
    </SectionCard>
  );
}
