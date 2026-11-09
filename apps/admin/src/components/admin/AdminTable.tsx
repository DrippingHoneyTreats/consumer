import { cn } from "@/lib/cn";

export function AdminTable({
  columns,
  rows,
  empty,
  className,
}: {
  columns: { key: string; label: string; className?: string }[];
  rows: { id: string; cells: React.ReactNode[] }[];
  empty?: string;
  className?: string;
}) {
  if (!rows.length) {
    return (
      <p className="rounded-2xl border border-dashed border-deep/15 bg-white/60 px-4 py-10 text-center text-sm text-deep/55">
        {empty ?? "Nothing here yet."}
      </p>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-deep/10 bg-white", className)}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-deep/10 bg-off-white/80">
            {columns.map((col) => (
              <th key={col.key} className={cn("px-4 py-3 font-semibold text-deep/70", col.className)}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-deep/5 last:border-0 hover:bg-deep/[0.02]">
              {row.cells.map((cell, i) => (
                <td key={`${row.id}-${columns[i]?.key ?? i}`} className="px-4 py-3 align-middle">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminCardList({
  items,
  empty,
}: {
  items: { id: string; content: React.ReactNode }[];
  empty?: string;
}) {
  if (!items.length) {
    return (
      <p className="rounded-2xl border border-dashed border-deep/15 px-4 py-8 text-center text-sm text-deep/55">
        {empty ?? "No items."}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-2xl border border-deep/10 bg-white p-4">
          {item.content}
        </li>
      ))}
    </ul>
  );
}
