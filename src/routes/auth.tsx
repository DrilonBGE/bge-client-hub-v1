import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { isTeamMember } from "@/lib/journey-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BgeMark } from "@/components/bge/AppShell";
import { FieldLabel } from "@/components/bge/atoms";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Build, Grow & Exit" },
      {
        name: "description",
        content: "Team sign in for the Build, Grow & Exit client journey board.",
      },
      { property: "og:title", content: "Sign in — Build, Grow & Exit" },
      { property: "og:description", content: "Team sign in for the BGE client journey board." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "reset">(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("reset")
      ? "reset"
      : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      void navigate({ to: (await isTeamMember()) ? "/dashboard" : "/portal" });
    });
  }, [navigate]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setSent("We've emailed you a link to set a new password.");
        toast.success("Reset link sent");
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      toast.success("Signed in");
      void navigate({ to: (await isTeamMember()) ? "/dashboard" : "/portal" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not sign in";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-3 py-6 sm:px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-card sm:p-6">
        <div className="mb-6 flex items-center gap-2">
          <BgeMark size={30} />
          <div>
            <h1 className="text-base font-semibold">Build, Grow &amp; Exit</h1>
            <p className="text-xs text-muted-foreground">Secure portal sign in</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <FieldLabel>Email</FieldLabel>
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourbusiness.com"
            />
          </div>
          {mode !== "reset" && (
            <div>
              <FieldLabel>Password</FieldLabel>
              <Input
                type="password"
                required
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          )}

          {sent && <p className="text-xs font-medium text-success">{sent}</p>}
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-primary text-primary-foreground hover:bg-primary-dark"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Email me a reset link"}
          </Button>
        </form>

        <div className="mt-4 space-y-2">
          <a
            href="/join"
            className="block w-full text-center text-xs text-muted-foreground hover:text-primary"
          >
            Just joined BGE? Open your onboarding page
          </a>
          <button
            onClick={() => {
              setMode(mode === "reset" ? "signin" : "reset");
              setError(null);
              setSent(null);
            }}
            className="w-full text-center text-xs text-muted-foreground hover:text-primary"
          >
            {mode === "reset" ? "Back to sign in" : "Forgot your password?"}
          </button>
        </div>
      </div>
    </div>
  );
}
