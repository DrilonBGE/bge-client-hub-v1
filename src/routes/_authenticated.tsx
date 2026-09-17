import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { setAuditUser } from "@/lib/queries";
import { isTeamMember } from "@/lib/journey-queries";
import { BoardProvider } from "@/components/bge/client-modal-context";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    if (!(await isTeamMember())) throw redirect({ to: "/portal" });
    const meta = data.user.user_metadata as { display_name?: string } | null;
    setAuditUser(meta?.display_name || data.user.email || "Team");
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <BoardProvider>
      <Outlet />
    </BoardProvider>
  );
}
