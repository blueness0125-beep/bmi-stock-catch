import { cn, formatPct } from '@/lib/utils'

interface Sector {
  name: string
  change_pct: number
}

interface Props {
  sectors: Sector[]
}

export default function SectorList({ sectors }: Props) {
  const top = sectors.slice(0, 8)
  const maxAbs = Math.max(...top.map((s) => Math.abs(s.change_pct)), 0.1)

  return (
    <div className="space-y-1.5">
      {top.map((s) => {
        const pct = (Math.abs(s.change_pct) / maxAbs) * 100
        const positive = s.change_pct >= 0
        return (
          <div key={s.name} className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 w-28 truncate shrink-0">{s.name}</span>
            <div className="flex-1 bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden">
              <div
                className={cn('h-full rounded-full', positive ? 'bg-emerald-500/60' : 'bg-rose-500/60')}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={cn('text-[11px] font-medium w-12 text-right', positive ? 'text-emerald-400' : 'text-rose-400')}>
              {formatPct(s.change_pct)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
