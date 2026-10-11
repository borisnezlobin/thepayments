import { FeeTicket } from "@/components/merchant/FeeTicket";
import { ImportForm } from "@/components/merchant/ImportForm";
import { Wordmark } from "@/components/ui/Wordmark";

const STEPS = [
  { title: "Paste your site", body: "We read your menu and prices from the page you already have." },
  { title: "Check it and go live", body: "Fix anything we got wrong, pick a discount for agent orders, and publish." },
  { title: "Agents order and pay", body: "Assistants like Instinct order pickup and pay in AUSD. Orders print on your dashboard." },
  { title: "Withdraw on Friday", body: "One click moves the week's money toward your bank." },
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-40 right-[-10%] size-[42rem] rounded-full bg-accent/25 blur-3xl" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Wordmark />
      </header>
      <main className="relative mx-auto flex max-w-6xl flex-col gap-24 px-6 pt-10 pb-24">
        <section className="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col gap-8">
            <h1 className="text-display font-bold sm:text-display-xl">Sell to AI agents and keep the card fee.</h1>
            <p className="max-w-xl text-body-lg text-ink-muted">
              Paste your website. We build a storefront that assistants like Instinct can order from and pay in seconds, with no card fee taken out.
            </p>
            <ImportForm />
          </div>
          <div className="flex justify-center lg:justify-end">
            <FeeTicket />
          </div>
        </section>
        <section aria-labelledby="how-it-works" className="flex flex-col gap-8">
          <h2 id="how-it-works" className="text-title font-bold">
            How it works
          </h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-2 rounded-card bg-surface-sunken p-6">
                <span className="tabular font-display text-title font-bold text-accent-ink">{index + 1}</span>
                <h3 className="text-body font-bold">{step.title}</h3>
                <p className="text-body-sm text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
