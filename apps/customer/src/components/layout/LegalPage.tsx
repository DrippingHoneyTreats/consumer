import type { ReactNode } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";

export const BUSINESS = {
  name: "Dripping Honey Treats",
  email: "hello@drippinghoneytreats.com",
  site: "www.drippinghoneytreats.com",
  address: "14 White Sands Beach Estate, Lekki, Lagos, Nigeria",
};

/** Shared layout for Privacy Policy / Terms: readable column, numbered sections. */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="page-pad pb-[calc(var(--tab-h)+var(--safe-bottom)+var(--banner-h,0px)+48px)]">
      <PageHeader title={title} subtitle={`Last updated ${updated}`} backHref="/account" />
      <article className="mx-auto max-w-2xl rounded-[28px] bg-white p-5 text-[15px] leading-relaxed text-deep/80 shadow-[var(--shadow-card)] ring-1 ring-deep/5 md:p-8">
        <div className="space-y-3">{intro}</div>
        <div className="mt-6 space-y-7">{children}</div>
        <footer className="mt-8 border-t border-deep/10 pt-5 text-sm text-deep/60">
          <p className="font-semibold text-deep">{BUSINESS.name}</p>
          <p>{BUSINESS.address}</p>
          <p>
            <a className="font-semibold text-tea underline-offset-2 hover:underline" href={`mailto:${BUSINESS.email}`}>
              {BUSINESS.email}
            </a>{" "}
            · {BUSINESS.site}
          </p>
          <p className="mt-3">
            See also:{" "}
            <Link href="/about" className="font-semibold text-tea">
              About us
            </Link>{" "}
            ·{" "}
            <Link href="/menu" className="font-semibold text-tea">
              Menu & prices
            </Link>{" "}
            ·{" "}
            <Link href="/privacy" className="font-semibold text-tea">
              Privacy Policy
            </Link>{" "}
            ·{" "}
            <Link href="/terms" className="font-semibold text-tea">
              Terms of Service
            </Link>
          </p>
        </footer>
      </article>
    </div>
  );
}

export function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section id={`s${n}`} className="scroll-mt-24">
      <h2 className="mb-2 font-display text-xl text-deep md:text-2xl">
        {n}. {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-tea">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
