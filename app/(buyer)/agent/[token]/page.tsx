import { StatusPanel } from "@/components/buyer/status-panel";
export const metadata = {
  title: "Connect your agent",
  robots: { index: false, follow: false },
};
// Agent links are retired. A token in the URL path ended up in request logs,
// browser history and chat link previews. This page never reads or uses it.
export default function AgentLink() {
  return (
    <div className="page narrow">
      <StatusPanel
        title="Agent links no longer work"
        href="/agents/connect"
        action="Connect your agent"
      >
        <p>
          Ask the account owner for an agent access token. Then paste it on the
          Connect your agent page.
        </p>
      </StatusPanel>
    </div>
  );
}
