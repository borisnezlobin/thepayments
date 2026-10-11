import { Button } from "@/components/ui/Button";
import { createAgentLink, revokeAgentLink } from "@/app/actions";
import { formatCents } from "@/lib/pricing";
import { CopyField } from "./CopyField";

interface AgentControlsProps {
  available: boolean;
  active: boolean;
  expiresAt: string | null;
  newLink: string | null;
  newToken: string | null;
  capCents: number;
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

function NewLink({ link, token, capCents }: { link: string; token: string | null; capCents: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-card bg-accent-wash p-5">
      <h3 className="text-body-lg font-semibold">Text this link to Instinct</h3>
      <CopyField value={link} label="Your private agent link" />
      {token ? (
        <>
          <p className="text-body-sm text-ink">
            If Instinct keeps logins in a vault, save this token there instead. It pastes the token at <span className="font-mono">/agents/connect</span>.
          </p>
          <CopyField value={token} label="Agent access token" copyLabel="Copy token" />
        </>
      ) : null}
      <p className="text-body-sm text-ink">
        Instinct connects once. After that it can order and pay from your wallet, up to {formatCents(capCents)} per order. This is the only time the link and token are shown.
      </p>
    </div>
  );
}

function Connected({ expiresAt }: { expiresAt: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="size-2.5 rounded-pill bg-accent" />
      <p className="text-body font-semibold">
        Instinct is connected{expiresAt ? <span className="font-normal text-ink-muted"> until {formatDay(expiresAt)}</span> : null}
      </p>
    </div>
  );
}

function LinkActions({ active }: { active: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={createAgentLink}>
        <Button variant={active ? "quiet" : "primary"} size={active ? "md" : "lg"}>
          {active ? "Make a new link" : "Create a link for Instinct"}
        </Button>
      </form>
      {active ? (
        <form action={revokeAgentLink}>
          <Button variant="quiet" className="text-danger">
            Disconnect
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export function AgentControls({ available, active, expiresAt, newLink, newToken, capCents }: AgentControlsProps) {
  return (
    <section id="agent-link" aria-labelledby="agent-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 id="agent-heading">Your agent</h2>
        <p className="text-body text-ink-muted">Text Instinct what you want. It orders and pays for you without asking you to approve anything.</p>
      </div>
      {available ? null : <p className="text-body-sm text-ink-muted">Agent links aren&rsquo;t available until account storage is set up.</p>}
      {available && newLink ? <NewLink link={newLink} token={newToken} capCents={capCents} /> : null}
      {available && active && !newLink ? <Connected expiresAt={expiresAt} /> : null}
      {available ? <LinkActions active={active} /> : null}
      <p className="text-body-sm text-ink-muted">The link can only order. It can&rsquo;t open your account or withdraw money. Making a new link turns off the old one.</p>
    </section>
  );
}
