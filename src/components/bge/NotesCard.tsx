import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { SectionCard } from "@/components/bge/atoms";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

/**
 * A shared scratchpad the team can type into, saved against a named key so the
 * same notes turn up for everyone who opens that page.
 */
export function NotesCard({
  noteKey,
  title,
  hint,
}: {
  noteKey: string;
  title: string;
  hint?: string;
}) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["app_config", noteKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", noteKey)
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? "";
    },
  });

  const [text, setText] = useState("");
  useEffect(() => setText(data ?? ""), [data]);

  const save = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase
        .from("app_config")
        .upsert({ key: noteKey, value } as never, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["app_config", noteKey] });
      toast.success("Notes saved");
    },
    onError: () => toast.error("Could not save the notes"),
  });

  return (
    <SectionCard
      title={title}
      action={
        <Button
          size="sm"
          variant="outline"
          disabled={save.isPending || text === (data ?? "")}
          onClick={() => save.mutate(text)}
        >
          {save.isPending ? "Saving…" : "Save notes"}
        </Button>
      }
    >
      {hint && <p className="mb-2 text-[12px] text-muted-foreground">{hint}</p>}
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={6}
        placeholder="Type anything the team needs to remember here…"
        className="bg-background text-[13px]"
      />
    </SectionCard>
  );
}
