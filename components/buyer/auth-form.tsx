import { LogoMark } from "@/components/ui/Logo";
import Link from "next/link";
import { signIn, signUp } from "@/app/actions";
import { authConfigured } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
export function AuthForm({
  mode,
  error,
  next,
  confirm,
}: {
  mode: "login" | "signup";
  error?: string;
  next?: string;
  confirm?: boolean;
}) {
  const signup = mode === "signup";
  const configured = authConfigured();
  return (
    <div className="auth-layout">
      <section className="auth-intro">
        <div className="round-mark" aria-hidden="true">
          <LogoMark className="size-10" />
        </div>
        <h1>
          {signup ? "Your coffee.\nYour agent." : "Good to have\nyou back."}
        </h1>
        <p>
          One account for your orders and the agents you trust to place them.
        </p>
        <p className="muted">
          You approve every order your agent asks for. You can disconnect it at
          any time.
        </p>
      </section>
      <section className="auth-box">
        <h2>{signup ? "Create your account" : "Sign in"}</h2>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {confirm && (
          <p className="notice" role="status">
            Check your email for a confirmation link, then sign in here.
          </p>
        )}
        {!configured && (
          <p className="notice">
            Accounts are not available yet. Sign-up opens when account setup is
            complete.
          </p>
        )}
        <form action={signup ? signUp : signIn} className="stack">
          <input type="hidden" name="next" value={next || "/account"} />
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            disabled={!configured}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            required
            minLength={8}
            maxLength={128}
            disabled={!configured}
            hint="At least 8 characters."
          />
          <Button size="lg" disabled={!configured}>
            {signup ? "Create account" : "Sign in"}
          </Button>
        </form>
        <p className="small muted">
          {signup ? "Already have an account? " : "New here? "}
          <Link href={signup ? "/login" : "/signup"}>
            {signup ? "Sign in" : "Create an account"}
          </Link>
        </p>
        <p className="small muted">
          Wallet funding and checkout are not available yet.
        </p>
      </section>
    </div>
  );
}
