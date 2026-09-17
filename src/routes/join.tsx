import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BgeMark } from "@/components/bge/AppShell";
import { FieldLabel } from "@/components/bge/atoms";

export const Route = createFileRoute("/join")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Welcome on board — Build, Grow & Exit" },
      {
        name: "description",
        content:
          "Set up your Build, Grow & Exit client portal with your name, email and the date of your first payment.",
      },
      { property: "og:title", content: "Welcome on board — Build, Grow & Exit" },
      {
        property: "og:description",
        content: "Create your Build, Grow & Exit client portal login in under a minute.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter both your first and last name.");
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Please use at least 8 characters for your password.");
      return;
    }
    setBusy(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/portal`,
          data: {
            display_name: fullName,
            phone: phone.trim(),
            first_payment_date: paidOn || null,
          },
        },
      });
      if (signUpError) throw signUpError;
      if (!data.session) {
        setSent("Check your email and click the link to confirm your account.");
        toast.success("Almost there — confirm your email");
        return;
      }
      toast.success("Welcome on board");
      void navigate({ to: "/portal", replace: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not create your account";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-3 py-6 sm:px-4 sm:py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <BgeMark size={52} />
          <h1 className="mt-3 text-xl font-semibold">Welcome on board</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Set up your Build, Grow &amp; Exit portal. Use the same email you paid with.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="mt-5 space-y-3 rounded-xl border border-border bg-card p-4 shadow-card sm:rounded-2xl sm:p-5"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>First name</FieldLabel>
              <Input
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Bill"
              />
            </div>
            <div>
              <FieldLabel>Second name</FieldLabel>
              <Input
                required
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Harper"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Your email</FieldLabel>
            <Input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourbusiness.com"
            />
          </div>
          <div>
            <FieldLabel>Your phone number</FieldLabel>
            <Input
              required
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+44 7700 900000"
            />
          </div>
          <div>
            <FieldLabel>Date of your first payment</FieldLabel>
            <Input
              required
              type="date"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Create a password</FieldLabel>
            <div className="relative">
              <Input
                required
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div>
            <FieldLabel>Re-enter your password</FieldLabel>
            <div className="relative">
              <Input
                required
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {sent && <p className="text-xs font-medium text-success">{sent}</p>}
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-primary text-primary-foreground hover:bg-primary-dark"
          >
            {busy ? "Setting up your portal…" : "Submit and open my portal"}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            You will get straight in. Your team verify the account shortly after, which opens
            everything else.
          </p>
        </form>

        <div className="mt-4 space-y-1.5 border-t border-border pt-3">
          <a
            href="/auth"
            className="block text-center text-xs text-muted-foreground hover:text-primary"
          >
            Already signed up? Sign in
          </a>
          <a
            href="/auth?reset=1"
            className="block text-center text-xs text-muted-foreground hover:text-primary"
          >
            Forgot your password?
          </a>
        </div>
      </div>
    </div>
  );
}
