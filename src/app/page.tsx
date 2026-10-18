import { CreateGroupForm } from "@/components/CreateGroupForm";
import { RecentGroups } from "@/components/RecentGroups";
import { Logo } from "@/components/ui";

const pains = [
  {
    icon: "∞",
    title: "No daily limits",
    body: "Add as many expenses as the trip needs. No “come back tomorrow” paywall in the middle of dinner.",
  },
  { icon: "🔗", title: "No signup", body: "Create a group, share the link. Your friends open it and they're in — no app, no account, no OTP." },
  { icon: "⚡", title: "Settle with UPI", body: "Tap “Pay via UPI” and GPay, PhonePe or Paytm opens with the exact amount filled in. QR on desktop." },
  { icon: "🚫", title: "No ads, ever", body: "A clean, fast ledger that respects you. Splits in paise, never floats, always adding up." },
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--brand-soft), transparent)" }}
      />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-4">
        <Logo className="text-xl" />
        <a href="#create" className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold hover:border-brand">
          Start a group
        </a>
      </header>

      <main className="relative mx-auto grid max-w-6xl gap-12 px-5 pt-6 pb-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-16">
        <section className="animate-rise">
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            <span className="size-1.5 rounded-full bg-brand" /> Free. Open. Made for UPI.
          </p>
          <h1 className="mt-5 text-[2.6rem] leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl">
            Split bills with friends.
            <span className="block text-brand">Settle up in one tap.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-pretty text-muted">
            Tabby keeps the running tab for trips, flats and dinners. No signup, no ads, no daily expense limits — and when
            it&apos;s time to pay, UPI opens with the amount already filled in.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {pains.map((p) => (
              <div key={p.title} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center gap-2.5">
                  <span aria-hidden className="flex size-8 items-center justify-center rounded-lg bg-surface-2 text-base font-bold">
                    {p.icon}
                  </span>
                  <h2 className="font-semibold">{p.title}</h2>
                </div>
                <p className="mt-2 text-sm text-muted">{p.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-line bg-surface p-4 text-sm">
            <p className="font-semibold">Why not Splitwise?</p>
            <ul className="mt-2 space-y-1.5 text-muted">
              <li>— Free users now hit a daily limit on new expenses, and see ads.</li>
              <li>— Every single friend has to download the app and sign up.</li>
              <li>— There&apos;s no way to actually pay in India: you settle in UPI, then mark it manually.</li>
            </ul>
          </div>
        </section>

        <section id="create" className="scroll-mt-6 lg:pt-4">
          <div className="animate-pop rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
            <h2 className="text-xl font-bold">Create a group</h2>
            <p className="mt-1 mb-5 text-sm text-muted">Takes ten seconds. You can add people later.</p>
            <CreateGroupForm />
          </div>
          <RecentGroups />
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        Tabby — the tab, without the tax. Groups are private to whoever has the link.
      </footer>
    </div>
  );
}
