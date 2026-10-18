"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="text-4xl" aria-hidden>
        😿
      </div>
      <h1 className="mt-4 text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted">That&apos;s on us. Please try again in a moment.</p>
      <button onClick={reset} className="mt-6 rounded-xl bg-brand px-5 py-3 font-semibold text-on-brand">
        Try again
      </button>
    </main>
  );
}
