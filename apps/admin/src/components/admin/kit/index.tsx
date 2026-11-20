"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAdminPageTitleStore } from "@/store/admin-page-title-store";

/**
 * Admin building blocks: one consistent layout for every page.
 *  PageHeader · Toolbar (search + filter tabs) · DataTable (click a row to open it)
 *  DetailLayout (main + sidebar) · Panel · Fields · StatCard
 */

// ───────────────────────── Page header ─────────────────────────

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  meta,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Link for the "‹ Back" crumb, e.g. { href: "/orders", label: "Orders" }. */
  back?: { href: string; label: string };
  actions?: ReactNode;
  /** Small badges next to the title (status etc.). */
  meta?: ReactNode;
}) {
  const setTitle = useAdminPageTitleStore((s) => s.setTitle);
  const plain = typeof title === "string" ? title : undefined;
  useEffect(() => {
    setTitle(plain);
    return () => setTitle(undefined);
  }, [plain, setTitle]);

  return (
    <header className="mb-6">
      {back ? (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-tea hover:text-deep">
          <ChevronLeft size={16} /> {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold text-deep md:text-[28px]">{title}</h1>
            {meta}
          </div>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm text-deep/60">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

// ───────────────────────── Toolbar ─────────────────────────

export function SearchBox({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-deep/15 bg-white px-3 focus-within:border-tea focus-within:ring-2 focus-within:ring-sage/30 sm:max-w-xs">
      <Search size={16} className="shrink-0 text-deep/40" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-base text-deep outline-none placeholder:text-deep/40 md:text-sm"
        aria-label={placeholder}
      />
      {value ? (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")} className="text-deep/40 hover:text-deep">
          <X size={15} />
        </button>
      ) : null}
    </label>
  );
}

export type Tab<T extends string> = { value: T; label: string; count?: number };

export function FilterTabs<T extends string>({ tabs, value, onChange }: { tabs: Tab<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
            value === t.value ? "bg-deep text-white" : "bg-white text-deep/70 ring-1 ring-deep/10 hover:text-deep",
          )}
        >
          {t.label}
          {t.count != null ? (
            <span className={cn("rounded-full px-1.5 text-[10px]", value === t.value ? "bg-white/20" : "bg-off-white")}>{t.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">{children}</div>;
}

// ───────────────────────── Data table ─────────────────────────

export type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  className?: string;
  /** Hidden on phones (the card view shows `primary`/`secondary` instead). */
  align?: "left" | "right";
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  href,
  loading,
  empty = "Nothing here yet.",
  mobile,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Where clicking a row goes. */
  href?: (row: T) => string;
  loading?: boolean;
  empty?: ReactNode;
  /** Phone layout for one row. Defaults to the first two columns. */
  mobile?: (row: T) => ReactNode;
}) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-deep/10 bg-white">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-deep/5 px-4 py-4 last:border-0">
            <div className="h-3.5 w-1/4 animate-pulse rounded bg-deep/10" />
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-deep/5" />
            <div className="ml-auto h-3.5 w-16 animate-pulse rounded bg-deep/10" />
          </div>
        ))}
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-deep/15 bg-white/60 px-4 py-14 text-center text-sm text-deep/55">{empty}</div>
    );
  }

  const open = (row: T) => href && router.push(href(row));

  return (
    <>
      {/* Desktop/tablet table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-deep/10 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-deep/10 bg-off-white/70">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn("whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-deep/50", c.align === "right" && "text-right", c.className)}
                >
                  {c.label}
                </th>
              ))}
              {href ? <th className="w-8" aria-hidden /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => open(row)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") open(row);
                }}
                tabIndex={href ? 0 : undefined}
                className={cn(
                  "border-b border-deep/5 last:border-0",
                  href && "cursor-pointer transition hover:bg-blush-soft/40 focus:bg-blush-soft/40 focus:outline-none",
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle", c.align === "right" && "text-right", c.className)}>
                    {c.render(row)}
                  </td>
                ))}
                {href ? (
                  <td className="pr-3 text-deep/30">
                    <ChevronRight size={16} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone cards */}
      <ul className="space-y-2 md:hidden">
        {rows.map((row) => {
          const body = mobile ? (
            mobile(row)
          ) : (
            <div className="min-w-0">
              <div className="font-semibold text-deep">{columns[0]?.render(row)}</div>
              <div className="mt-0.5 text-sm text-deep/60">{columns[1]?.render(row)}</div>
            </div>
          );
          return (
            <li key={rowKey(row)}>
              {href ? (
                <Link href={href(row)} className="flex items-center gap-3 rounded-2xl border border-deep/10 bg-white p-4 active:bg-blush-soft/40">
                  <div className="min-w-0 flex-1">{body}</div>
                  <ChevronRight size={16} className="shrink-0 text-deep/30" />
                </Link>
              ) : (
                <div className="rounded-2xl border border-deep/10 bg-white p-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ───────────────────────── Detail layout ─────────────────────────

/** Main column + sticky sidebar on desktop; stacked on phones (sidebar first if `asideFirst`). */
export function DetailLayout({ main, aside, asideFirst }: { main: ReactNode; aside: ReactNode; asideFirst?: boolean }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className={cn("min-w-0 space-y-5", asideFirst && "order-2 lg:order-1")}>{main}</div>
      <aside className={cn("space-y-5 lg:sticky lg:top-6", asideFirst && "order-1 lg:order-2")}>{aside}</aside>
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-deep/10 bg-white", className)}>
      {title || actions ? (
        <div className="flex items-center justify-between gap-3 border-b border-deep/5 px-4 py-3 md:px-5">
          {title ? <h2 className="text-sm font-semibold text-deep">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      <div className={cn(padded && "p-4 md:p-5")}>{children}</div>
    </section>
  );
}

/** Label/value rows. */
export function Fields({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-deep/5 text-sm">
      {items.map((it) => (
        <div key={it.label} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-deep/55">{it.label}</dt>
          <dd className="min-w-0 text-right font-medium text-deep [overflow-wrap:anywhere]">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  icon,
  tone = "light",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  icon?: ReactNode;
  tone?: "light" | "dark" | "blush" | "honey";
}) {
  const body = (
    <div
      className={cn(
        "h-full rounded-2xl border p-4 transition md:p-5",
        tone === "dark" && "border-deep bg-deep text-white",
        tone === "light" && "border-deep/10 bg-white",
        tone === "blush" && "border-blush/60 bg-blush-soft",
        tone === "honey" && "border-honey/40 bg-honey-soft",
        href && "hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-xs font-semibold uppercase tracking-wide", tone === "dark" ? "text-white/65" : "text-deep/50")}>{label}</p>
        {icon ? <span className={tone === "dark" ? "text-honey" : "text-tea"}>{icon}</span> : null}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold md:text-[28px]">{value}</p>
      {hint ? <p className={cn("mt-1 text-xs", tone === "dark" ? "text-white/60" : "text-deep/55")}>{hint}</p> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

/** Small round avatar with initials. */
export function Avatar({ name, size = 40 }: { name?: string | null; size?: number }) {
  const initials =
    (name ?? "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-blush font-display font-semibold text-deep"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
