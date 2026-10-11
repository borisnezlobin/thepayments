import { LogoMark } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { connectAgentWithToken } from "@/app/actions";
export const metadata = {
  title: "Connect your agent",
  robots: { index: false, follow: false },
};
// A plain form so browser agents can autofill the token from a vault. It posts
// through a server action, which works without JavaScript and keeps the token
// out of the URL.
export default async function ConnectAgent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="page narrow">
      <section className="connect-panel">
        <span className="round-mark small-mark" aria-hidden="true">
          <LogoMark className="size-10" />
        </span>
        <h1>Connect your agent</h1>
        <p className="lead">
          Paste the agent access token from the buyer&rsquo;s account page.
        </p>
        <form action={connectAgentWithToken} className="stack">
          <Field
            label="Agent access token"
            name="token"
            id="agent-access-token"
            type="password"
            autoComplete="current-password"
            autoCapitalize="off"
            spellCheck={false}
            required
            maxLength={128}
            error={
              error === "invalid"
                ? "That token didn't work. It may be mistyped, expired or revoked."
                : null
            }
          />
          <Button size="lg">Connect</Button>
        </form>
        <p className="muted">
          A connected agent can browse shops and place orders. It can&rsquo;t
          open account settings or withdraw money.
        </p>
      </section>
    </div>
  );
}
