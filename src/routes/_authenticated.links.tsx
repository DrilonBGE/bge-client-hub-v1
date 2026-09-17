import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AppShell } from "@/components/bge/AppShell";
import { useBoard } from "@/components/bge/client-modal-context";
import { EmptyState, SectionCard } from "@/components/bge/atoms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useTeamLinks } from "@/lib/queries";
import { LinkLibrary } from "@/components/bge/LinkLibrary";

export const Route = createFileRoute("/_authenticated/links")({
  head: () => ({
    meta: [
      { title: "Important Links — BGE Client Journey Board" },
      {
        name: "description",
        content: "Team contact details and the links the executive team uses every day.",
      },
      { property: "og:title", content: "Important Links — BGE Client Journey Board" },
      { property: "og:description", content: "Team contacts and everyday working links." },
    ],
  }),
  component: LinksPage,
});

function LinksPage() {
  const { sync } = useBoard();
  const { data: links } = useTeamLinks();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", role: "", email: "", phone: "", link: "" });
  const team = (links ?? []).filter((row) => (row.category ?? "team") === "team");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["team_links"] });

  const upsert = useMutation({
    mutationFn: async (row: { id: string; patch: Record<string, string> }) => {
      const { error } = await supabase
        .from("team_links")
        .update(row.patch as never)
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const insert = useMutation({
    mutationFn: async (row: typeof form) => {
      const { error } = await supabase.from("team_links").insert({
        name: row.name,
        role: row.role || null,
        email: row.email || null,
        phone: row.phone || null,
        link: row.link || null,
        sort_order: (links?.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Team member added");
      setForm({ name: "", role: "", email: "", phone: "", link: "" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return (
    <AppShell
      title="Important Links"
      subtitle="Team contacts and everyday working links"
      sync={sync}
    >
      <div className="space-y-4">
        <SectionCard title="Team">
          {team.length === 0 ? (
            <EmptyState>No team members listed yet.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Phone</th>
                    <th className="pb-2 font-medium">Link</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {team.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      {(["name", "role", "email", "phone"] as const).map((field) => (
                        <td key={field} className="py-1.5 pr-2">
                          <Input
                            defaultValue={row[field] ?? ""}
                            onBlur={(e) =>
                              upsert.mutate({ id: row.id, patch: { [field]: e.target.value } })
                            }
                            className="h-8 bg-card"
                          />
                        </td>
                      ))}
                      <td className="py-1.5 pr-2">
                        <div className="flex items-center gap-1.5">
                          <Input
                            defaultValue={row.link ?? ""}
                            onBlur={(e) =>
                              upsert.mutate({ id: row.id, patch: { link: e.target.value } })
                            }
                            className="h-8 bg-card"
                          />
                          {row.link && (
                            <a
                              href={row.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary"
                              aria-label="Open link"
                            >
                              <ExternalLink className="size-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5">
                        <button
                          onClick={() => remove.mutate(row.id)}
                          className="text-destructive hover:opacity-70"
                          aria-label="Delete row"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form
            className="mt-3 grid gap-2 sm:grid-cols-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!form.name.trim()) {
                toast.error("Name is required");
                return;
              }
              insert.mutate(form);
            }}
          >
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name"
              className="h-9"
            />
            <Input
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="Role"
              className="h-9"
            />
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className="h-9"
            />
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone"
              className="h-9"
            />
            <Input
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="Link"
              className="h-9"
            />
            <Button type="submit" variant="outline" className="h-9">
              <Plus className="size-3.5" /> Add
            </Button>
          </form>
        </SectionCard>

        <LinkLibrary
          category="website"
          title="Key websites"
          hint="The sites and tools we work in every day — add a title and the link."
        />
      </div>
    </AppShell>
  );
}
