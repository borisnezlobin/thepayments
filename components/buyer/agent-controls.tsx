import { Button } from "@/components/ui/Button";
import { createAgentLink, revokeAgentLink } from "@/app/actions";
export function AgentControls({
  available,
  active,
  expiresAt,
  newLink,
}: {
  available: boolean;
  active: boolean;
  expiresAt: string | null;
  newLink: string | null;
}) {
  if (!available)
    return (
      <p className="notice">
        Agent links are not available yet. Account storage needs to be
        configured.
      </p>
    );
  return (
    <div className="agent-controls">
      <span className={`pill ${active ? "" : "neutral"}`}>
        {active ? "Agent link active" : "No active agent link"}
      </span>
      {active && expiresAt && (
        <p className="small muted">
          Expires{" "}
          {new Date(expiresAt).toLocaleDateString("en-US", { timeZone: "UTC" })}{" "}
          (UTC).
        </p>
      )}
      {newLink && (
        <div className="link-reveal">
          <label htmlFor="new-link">Your private agent link</label>
          <textarea id="new-link" readOnly value={newLink} rows={3} />
          <p className="small">
            Copy this now. It is shown for two minutes. Anyone with it can ask
            for orders on your account. You still approve each one.
          </p>
        </div>
      )}
      <form action={createAgentLink}>
        <Button>{active ? "Replace agent link" : "Create agent link"}</Button>
      </form>
      {active && (
        <form action={revokeAgentLink}>
          <Button variant="quiet" className="text-danger">
            Revoke agent access
          </Button>
        </form>
      )}
    </div>
  );
}
