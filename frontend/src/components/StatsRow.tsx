import { cn } from '@/lib/utils'

interface Stat {
  label: string
  value: string | number
  sub?: string
  highlight?: 'green' | 'amber' | 'red' | 'default'
}

interface Props {
  stats: Stat[]
}

const highlightClass = {
  green: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-rose-400',
  default: 'text-white',
}

export default function StatsRow({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="bg-[#111111] border border-[#222222] rounded-xl px-4 py-3">
          <p className="text-[11px] text-slate-500 mb-1">{s.label}</p>
          <p className={cn('text-xl font-bold', highlightClass[s.highlight ?? 'default'])}>
            {s.value}
          </p>
          {s.sub && <p className="text-[10px] text-slate-600 mt-0.5">{s.sub}</p>}
        </div>
      ))}
    </div>
  )
}
