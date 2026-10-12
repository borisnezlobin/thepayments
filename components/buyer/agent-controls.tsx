import { Button } from "@/components/ui/Button";
import { createAgentLink, revokeAgentLink } from "@/app/actions";
import { formatCents } from "@/lib/pricing";
import { CopyField } from "./CopyField";

interface AgentControlsProps {
  available: boolean;
  active: boolean;
  expiresAt: string | null;
  newToken: string | null;
  newTokenExpiresAt: string | null;
  capCents: number;
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}

function NewToken({ token, expiresAt, capCents }: { token: string; expiresAt: string | null; capCents: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-card bg-accent-wash p-5">
      <h3 className="text-body-lg font-semibold">Connect Instinct</h3>
      <p className="text-body-sm text-ink">
        Save this token in Instinct&rsquo;s vault. Instinct pastes it at <span className="font-mono">/agents/connect</span>. It works once{expiresAt ? `, until ${formatTime(expiresAt)} UTC` : ""}.
      </p>
      <CopyField value={token} label="Agent access token" copyLabel="Copy token" />
      <p className="text-body-sm text-ink">
        After it connects, Instinct stays signed in for 90 days or until you disconnect it. It can ask for orders up to {formatCents(capCents)}. Each one waits here for your approval.
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

function LinkActions({ active, pending }: { active: boolean; pending: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={createAgentLink}>
        <Button variant={active ? "quiet" : "primary"} size={active ? "md" : "lg"}>
          {active ? "Connect again" : "Connect Instinct"}
        </Button>
      </form>
      {active || pending ? (
        <form action={revokeAgentLink}>
          <Button variant="quiet" className="text-danger">
            {active ? "Disconnect" : "Cancel this token"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export function AgentControls({ available, active, expiresAt, newToken, newTokenExpiresAt, capCents }: AgentControlsProps) {
  return (
    <section id="agent-link" aria-labelledby="agent-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 id="agent-heading">Your agent</h2>
        <p className="text-body text-ink-muted">Text Instinct what you want. It finds the shop and asks to place the order. Nothing is paid until you approve it here.</p>
      </div>
      {available ? null : <p className="text-body-sm text-ink-muted">Agent connections aren&rsquo;t available until account storage is set up.</p>}
      {available && newToken ? <NewToken token={newToken} expiresAt={newTokenExpiresAt} capCents={capCents} /> : null}
      {available && active ? <Connected expiresAt={expiresAt} /> : null}
      {available ? <LinkActions active={active} pending={Boolean(newToken)} /> : null}
      <p className="text-body-sm text-ink-muted">A connected agent can only browse and ask for orders. It can&rsquo;t open your account, approve orders or withdraw money. Connecting again replaces the old session once Instinct uses the new token.</p>
    </section>
  );
}
