import { AgentOrderExample } from "@/components/merchant/AgentOrderExample";
import { FeeTicket } from "@/components/merchant/FeeTicket";
import { ImportForm } from "@/components/merchant/ImportForm";
import { HomeLogo } from "@/components/ui/Logo";

export default function Home() {
  return (
    <div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <HomeLogo />
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-32 px-6 pt-8 pb-32">
        <section className="grid items-center gap-16 lg:layout-hero">
          <div className="flex flex-col gap-8">
            <h1 className="text-display font-bold sm:text-display-xl">Sell to AI agents and keep the card fee.</h1>
            <p className="max-w-xl text-body-lg text-ink-muted">
              Paste your website and we&rsquo;ll build a storefront that assistants like Instinct can order from. They pay in AUSD. You withdraw to your bank once a week.
            </p>
            <ImportForm />
          </div>
          <div className="flex justify-center lg:justify-end">
            <FeeTicket />
          </div>
        </section>
        <AgentOrderExample />
      </main>
    </div>
  );
}
