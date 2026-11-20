import Link from "next/link";

export const metadata = { title: "Page not found" };

/** Branded 404, readable on the light app background. */
export default function NotFound() {
  return (
    <div className="page-pad flex min-h-[70dvh] flex-col items-center justify-center text-center">
      <p className="font-display text-7xl text-deep/15 md:text-8xl">404</p>
      <h1 className="mt-2 font-display text-3xl text-deep md:text-4xl">This page has crumbled</h1>
      <p className="mt-2 max-w-sm text-sm text-deep/60 md:text-base">
        We couldn&apos;t find what you were looking for. It may have moved, or the link may be wrong.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="pressable rounded-full bg-deep px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)]"
        >
          Back to home
        </Link>
        <Link
          href="/pastries"
          className="pressable rounded-full bg-white px-6 py-3 text-sm font-semibold text-deep ring-1 ring-deep/10"
        >
          Browse the menu
        </Link>
      </div>
    </div>
  );
}
