import { Robot } from "@phosphor-icons/react/dist/ssr";
import { buttonClasses } from "@/components/ui/Button";
import Link from "next/link";
import { appOrigin } from "@/lib/config";
export const metadata = { title: "Order with your agent" };
export default function Agents() {
  const endpoint = `${appOrigin()}/mcp`;
  const sessionEndpoint = `${appOrigin()}/api/buyer/agent-session`;
  return (
    <div className="page agents">
      <header className="page-heading">
        <div>
          <h1>
            You ask.
            <br />
            Your agent orders.
          </h1>
          <p className="lead">
            A familiar storefront for browser agents. A direct connection for
            MCP clients.
          </p>
        </div>
        <div className="agent-mark" aria-hidden="true">
          <Robot size={112} weight="duotone" />
        </div>
      </header>
      <section className="agent-section">
        <div>
          <span className="pill neutral">Instinct &amp; browser agents</span>
          <h2>
            Give your agent a token,
            <br />
            not your password.
          </h2>
        </div>
        <div>
          <ol className="steps">
            <li>Create a buyer account and open your account page.</li>
            <li>
              Press Connect Instinct. Save the access token in your
              agent&rsquo;s vault.
            </li>
            <li>
              Your agent pastes the token at{" "}
              <Link href="/agents/connect">Connect your agent</Link>. It works
              once, within 15 minutes.
            </li>
            <li>
              It stays signed in for 90 days. It can come back and order without
              a new token.
            </li>
            <li>
              It chooses quantities, updates the order total and enters a pickup
              name. Then it sends the order for approval.
            </li>
            <li>Approve or decline it on your account page.</li>
          </ol>
          <p className="notice">
            Your agent can only ask. Nothing is charged until you approve the
            order yourself. You can disconnect it at any time.
          </p>
          <Link className={buttonClasses()} href="/account">
            Manage your agent
          </Link>
        </div>
      </section>
      <section id="mcp" className="agent-section">
        <div>
          <span className="pill neutral">Claude, Cursor &amp; MCP clients</span>
          <h2>Connect directly.</h2>
          <p className="muted">Streamable HTTP on the same site.</p>
        </div>
        <div>
          <label className="field-hint" htmlFor="mcp-url">
            MCP server URL
          </label>
          <input id="mcp-url" readOnly value={endpoint} />
          <pre className="code-sample">
            {JSON.stringify(
              {
                mcpServers: {
                  thepayments: {
                    url: endpoint,
                    headers: { Authorization: "Bearer <agent session token>" },
                  },
                },
              },
              null,
              2,
            )}
          </pre>
          <p className="small muted">
            Get the session token once by sending a new access token to{" "}
            <code>POST {sessionEndpoint}</code> as{" "}
            <code>{`{"token": "<agent access token>"}`}</code>. Client
            configuration varies. Use this URL with an MCP client that supports
            Streamable HTTP.
          </p>
          <dl className="tool-list">
            <div>
              <dt>find_shops</dt>
              <dd>Search the directory of live shops.</dd>
            </div>
            <div>
              <dt>get_menu</dt>
              <dd>Get items, availability, and prices for a shop.</dd>
            </div>
            <div>
              <dt>place_order</dt>
              <dd>
                Sends an order to the buyer for approval. It needs the agent
                session token as a Bearer token. Nothing is paid until the buyer
                approves it.
              </dd>
            </div>
          </dl>
          <p className="small muted">
            The directory and menu tools become available when the shop catalog
            is connected. No tool creates simulated orders.
          </p>
          <div className="link-row">
            <a href="/llms.txt">Read llms.txt</a>
            <a href="/mcp">MCP connection page</a>
          </div>
        </div>
      </section>
    </div>
  );
}
