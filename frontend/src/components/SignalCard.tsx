import { cn, formatPrice, formatKRW, formatPct, gradeBg, scoreTotal } from '@/lib/utils'
import type { Signal } from '@/lib/api'

interface Props {
  signal: Signal
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="w-full bg-[#222] rounded-full h-1">
      <div className={cn('h-1 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

function ScorePill({ label, value, max }: { label: string; value: number; max: number }) {
  const full = value === max
  return (
    <div className={cn('text-center px-1.5 py-1 rounded', full ? 'bg-emerald-500/10' : 'bg-[#1a1a1a]')}>
      <p className="text-[9px] text-slate-500 leading-none mb-0.5">{label}</p>
      <p className={cn('text-xs font-bold leading-none', full ? 'text-emerald-400' : 'text-slate-300')}>
        {value}/{max}
      </p>
    </div>
  )
}

export default function SignalCard({ signal }: Props) {
  const {
    stock_code, stock_name, market, grade,
    score, quality,
    current_price, entry_price, stop_price, target_price,
    change_pct, trading_value,
    foreign_5d, inst_5d,
    themes,
  } = signal

  const total = scoreTotal(score)
  const scoreObj = typeof score === 'object' ? score : null
  const isPositive = change_pct >= 0
  const riskReward = entry_price > 0
    ? ((target_price - entry_price) / (entry_price - stop_price)).toFixed(1)
    : '-'

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 hover:border-[#333333] transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white font-semibold text-sm">{stock_name}</span>
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-bold', gradeBg(grade))}>
              {grade}등급
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">{stock_code}</span>
            <span className="text-slate-700">·</span>
            <span className="text-[11px] text-slate-500">{market}</span>
          </div>
        </div>
        <div className="text-right">
          <p className={cn('text-lg font-bold', isPositive ? 'text-emerald-400' : 'text-rose-400')}>
            {formatPct(change_pct)}
          </p>
          <p className="text-[11px] text-slate-500">{formatPrice(current_price)}</p>
        </div>
      </div>

      {/* Score */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-slate-500">총점</span>
          <span className="text-xs font-semibold text-white">{total}/15 · 품질 {quality?.toFixed(0)}점</span>
        </div>
        <ScoreBar
          value={total}
          max={15}
          color={grade === 'A' ? 'bg-emerald-500' : grade === 'B' ? 'bg-amber-500' : 'bg-slate-500'}
        />
      </div>

      {/* Score breakdown */}
      {scoreObj && (
        <div className="grid grid-cols-4 gap-1 mb-3">
          <ScorePill label="뉴스" value={scoreObj.news} max={3} />
          <ScorePill label="거래량" value={scoreObj.volume} max={3} />
          <ScorePill label="차트" value={scoreObj.chart} max={3} />
          <ScorePill label="수급" value={scoreObj.supply} max={2} />
        </div>
      )}

      {/* Prices */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <p className="text-[10px] text-slate-500 mb-0.5">진입가</p>
          <p className="text-xs font-medium text-slate-200">{entry_price.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-rose-500 mb-0.5">손절가</p>
          <p className="text-xs font-medium text-rose-400">{stop_price.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-emerald-500 mb-0.5">목표가</p>
          <p className="text-xs font-medium text-emerald-400">{target_price.toLocaleString()}</p>
        </div>
      </div>

      {/* Supply & Trading value */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[10px] text-slate-600">외국인 </span>
            <span className={cn('text-[10px] font-medium', foreign_5d >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {foreign_5d >= 0 ? '+' : ''}{(foreign_5d / 1000000).toFixed(0)}M
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-600">기관 </span>
            <span className={cn('text-[10px] font-medium', inst_5d >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {inst_5d >= 0 ? '+' : ''}{(inst_5d / 1000000).toFixed(0)}M
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500">{formatKRW(trading_value)}</p>
          <p className="text-[10px] text-slate-600">R/R: {riskReward}</p>
        </div>
      </div>

      {/* Themes */}
      {themes?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {themes.map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-[#1a1a1a] text-slate-400 rounded">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* LLM reason */}
      {scoreObj?.llm_reason && (
        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed border-t border-[#1a1a1a] pt-2">
          {scoreObj.llm_reason}
        </p>
      )}
    </div>
  )
}
