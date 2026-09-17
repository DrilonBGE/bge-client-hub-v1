import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { isTeamMember } from "@/lib/journey-queries";

export const Route = createFileRoute("/_portal")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    if (await isTeamMember()) throw redirect({ to: "/dashboard" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
