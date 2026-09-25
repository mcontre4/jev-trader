import type { StatusTone } from '../../data/demo'

export function StatusPill({ tone, label }: { tone: StatusTone; label: string }) {
  return <span className={`pill pill-${tone}`}>{label}</span>
}
