import { Robot } from "@phosphor-icons/react/dist/ssr";
import { buttonClasses } from "@/components/ui/Button";
import Link from "next/link";
import { appOrigin } from "@/lib/config";
export const metadata = { title: "Order with your agent" };
export default function Agents() {
  const endpoint = `${appOrigin()}/mcp`;
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
            Give your agent a link,
            <br />
            not your password.
          </h2>
        </div>
        <div>
          <ol className="steps">
            <li>Create a buyer account and open your account page.</li>
            <li>Create a private agent link and send it to your agent.</li>
            <li>Ask it to open the link, connect, and find your shop.</li>
            <li>
              Choose quantities, update the order total, and enter a pickup
              name.
            </li>
          </ol>
          <p className="notice">
            Ordering stops at checkout for now. Wallet funding and payment are
            not connected yet.
          </p>
          <Link className={buttonClasses()} href="/account">
            Manage your agent link
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
              { mcpServers: { thepayments: { url: endpoint } } },
              null,
              2,
            )}
          </pre>
          <p className="small muted">
            Client configuration varies. Use this URL with an MCP client that
            supports Streamable HTTP.
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
                Reserved for wallet checkout. Returns
                payment_integration_pending until Track B is connected.
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
