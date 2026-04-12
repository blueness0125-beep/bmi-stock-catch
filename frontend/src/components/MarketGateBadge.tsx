import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MarketGateResponse } from '@/lib/api'

interface Props {
  data: MarketGateResponse | null
  error?: boolean
}

const regimeConfig = {
  RISK_ON: {
    label: 'RISK ON',
    sub: '매수 우호적',
    icon: TrendingUp,
    className: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    dotClass: 'bg-emerald-400 animate-pulse',
  },
  RISK_OFF: {
    label: 'RISK OFF',
    sub: '매수 비우호적',
    icon: TrendingDown,
    className: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    dotClass: 'bg-rose-400',
  },
  NEUTRAL: {
    label: 'NEUTRAL',
    sub: '중립 구간',
    icon: Minus,
    className: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    dotClass: 'bg-amber-400',
  },
  UNKNOWN: {
    label: 'UNKNOWN',
    sub: '데이터 없음',
    icon: Minus,
    className: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
    dotClass: 'bg-slate-400',
  },
}

export default function MarketGateBadge({ data, error }: Props) {
  if (error || !data) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
        <div className="w-2 h-2 rounded-full bg-slate-500" />
        <span className="text-xs text-slate-500 font-medium">데이터 로딩 중</span>
      </div>
    )
  }

  const regime = data.regime ?? 'UNKNOWN'
  const cfg = regimeConfig[regime] ?? regimeConfig.UNKNOWN
  const Icon = cfg.icon

  return (
    <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full border', cfg.className)}>
      <div className={cn('w-2 h-2 rounded-full', cfg.dotClass)} />
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs font-semibold">{cfg.label}</span>
      <span className="text-xs opacity-70 hidden sm:inline">— {cfg.sub}</span>
    </div>
  )
}
