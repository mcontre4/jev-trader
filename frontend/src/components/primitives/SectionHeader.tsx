export function SectionHeader({
  kicker, title, lead,
}: { kicker: string; title: string; lead?: string }) {
  return (
    <header className="section-header">
      <p className="kicker mono">{kicker}</p>
      <h2>{title}</h2>
      {lead && <p className="lead">{lead}</p>}
    </header>
  )
}
