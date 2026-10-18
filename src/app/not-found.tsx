import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <Logo className="text-xl" />
      <h1 className="mt-8 text-2xl font-bold">We couldn&apos;t find that tab</h1>
      <p className="mt-2 text-muted">The link may be mistyped, or the group no longer exists. Ask whoever shared it to send it again.</p>
      <Link href="/" className="mt-6 rounded-xl bg-brand px-5 py-3 font-semibold text-on-brand">
        Start a new group
      </Link>
    </main>
  );
}
