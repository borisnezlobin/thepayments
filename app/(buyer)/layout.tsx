import { HomeLogo } from "@/components/ui/Logo";
import Link from "next/link";
import { connection } from "next/server";
import { getPrincipal } from "@/lib/buyer/auth";
import { signOut } from "@/app/actions";
import { Button, buttonClasses } from "@/components/ui/Button";
import "./buyer.css";
// Buyer pages intentionally block for complete no-JavaScript HTML.
// The shared cacheComponents/partialPrefetching configuration stays unchanged.
export const instant = false;
export default async function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const principal = await getPrincipal();
  return (
    <div className="buyer-site">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <HomeLogo className="h-6 w-auto md:h-7" />
        <nav aria-label="Main navigation">
          <Link href="/shops">Shops</Link>
          <Link href="/agents">For agents</Link>
          {principal?.kind === "agent" ? (
            <span className="pill">Agent access</span>
          ) : (
            <Link href="/account">My account</Link>
          )}
          {principal ? (
            <form action={signOut}>
              <Button variant="quiet">Sign out</Button>
            </form>
          ) : (
            <Link className={buttonClasses("quiet")} href="/login">
              Sign in
            </Link>
          )}
        </nav>
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer">
        <HomeLogo className="h-5 w-auto" />
        <p>Local shops. A little more in everyone’s pocket.</p>
        <Link href="/mcp">Connect an agent</Link>
      </footer>
    </div>
  );
}
