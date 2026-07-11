// Re-mounts on every route change, replaying the enter animation for smooth page transitions.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
