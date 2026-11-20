/**
 * Full-viewport app shell. The intro (frosted glass parting) is pure CSS,
 * rendered in app/layout.tsx and styled in globals.css, so it plays on its
 * own schedule even before JavaScript loads and can never get stuck.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="app-shell">{children}</div>;
}
