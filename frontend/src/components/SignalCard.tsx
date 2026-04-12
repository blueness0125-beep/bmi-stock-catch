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
  const partial = value > 0 && value < max
  return (
    <div className={cn(
      'text-center px-1.5 py-1 rounded',
      full ? 'bg-emerald-500/10' : partial ? 'bg-amber-500/10' : 'bg-[#1a1a1a]'
    )}>
      <p className="text-[9px] text-slate-500 leading-none mb-0.5">{label}</p>
      <p className={cn(
        'text-xs font-bold leading-none',
        full ? 'text-emerald-400' : partial ? 'text-amber-400' : 'text-slate-500'
      )}>
        {value}/{max}
      </p>
    </div>
  )
}

function CheckBadge({ label, active, variant = 'positive' }: { label: string; active: boolean; variant?: 'positive' | 'negative' }) {
  if (!active) return null
  return (
    <span className={cn(
      'text-[9px] px-1.5 py-0.5 rounded font-medium',
      variant === 'negative' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
    )}>
      {label}
    </span>
  )
}

export default function SignalCard({ signal }: Props) {
  const {
    stock_code, stock_name, market, grade,
    score, quality,
    current_price, entry_price, stop_price, target_price,
    change_pct, trading_value,
    foreign_5d, inst_5d,
    themes, checklist, news_items,
    r_value, r_multiplier, quantity,
  } = signal

  const total = scoreTotal(score)
  const scoreObj = typeof score === 'object' ? score : null
  const isPositive = change_pct >= 0
  const riskReward = entry_price > 0
    ? ((target_price - entry_price) / (entry_price - stop_price)).toFixed(1)
    : '-'

  const opt = checklist?.optional
  const neg = checklist?.negative

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
            {opt?.is_new_high && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-medium">신고가</span>
            )}
            {neg?.negative_news && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-medium">부정뉴스</span>
            )}
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

      {/* Score total bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-slate-500">총점</span>
          <span className="text-xs font-semibold text-white">
            {total}/15 · 품질 {quality?.toFixed(0)}점
          </span>
        </div>
        <ScoreBar
          value={total}
          max={15}
          color={grade === 'A' ? 'bg-emerald-500' : grade === 'B' ? 'bg-amber-500' : 'bg-slate-500'}
        />
      </div>

      {/* 8-item score breakdown */}
      {scoreObj && (
        <div className="grid grid-cols-4 gap-1 mb-3">
          <ScorePill label="뉴스" value={scoreObj.news} max={3} />
          <ScorePill label="거래량" value={scoreObj.volume} max={3} />
          <ScorePill label="차트" value={scoreObj.chart} max={3} />
          <ScorePill label="캔들" value={scoreObj.candle} max={1} />
          <ScorePill label="눌림목" value={scoreObj.pullback_support} max={1} />
          <ScorePill label="되돌림" value={scoreObj.retracement} max={1} />
          <ScorePill label="수급" value={scoreObj.supply} max={2} />
          <ScorePill label="압축" value={scoreObj.consolidation} max={1} />
        </div>
      )}

      {/* Checklist badges */}
      {opt && (
        <div className="flex flex-wrap gap-1 mb-3">
          <CheckBadge label="MA정렬" active={!!opt.ma_aligned} />
          <CheckBadge label="좋은캔들" active={!!opt.good_candle} />
          <CheckBadge label="수급양호" active={!!opt.supply_positive} />
          <CheckBadge label="되돌림복귀" active={!!opt.retracement_recovery} />
          <CheckBadge label="눌림지지" active={!!opt.pullback_support_confirmed} />
          <CheckBadge label="압축구간" active={!!opt.has_consolidation} />
          <CheckBadge label="돌파" active={!!opt.is_breakout} />
          <CheckBadge label="윗꼬리" active={!!opt.upper_wick_long} variant="negative" />
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

      {/* Position sizing */}
      {(r_value > 0 || r_multiplier > 0 || quantity > 0) && (
        <div className="flex items-center justify-between py-2 mb-2 border-y border-[#1a1a1a] text-[10px]">
          <div className="flex items-center gap-3">
            {r_value > 0 && (
              <span className="text-slate-500">R: <span className="text-slate-300 font-medium">{formatKRW(r_value)}</span></span>
            )}
            {r_multiplier > 0 && (
              <span className="text-slate-500">배수: <span className="text-slate-300 font-medium">{r_multiplier.toFixed(1)}R</span></span>
            )}
            {quantity > 0 && (
              <span className="text-slate-500">수량: <span className="text-slate-300 font-medium">{quantity}주</span></span>
            )}
          </div>
          <span className="text-slate-600">R/R: {riskReward}</span>
        </div>
      )}

      {/* Supply & Trading value */}
      <div className="flex items-center justify-between pt-0.5">
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
        <p className="text-[10px] text-slate-500">{formatKRW(trading_value)}</p>
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

      {/* AI reason */}
      {scoreObj?.llm_reason && (
        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed border-t border-[#1a1a1a] pt-2">
          {scoreObj.llm_reason}
        </p>
      )}

      {/* News items */}
      {news_items && news_items.length > 0 && (
        <div className="mt-2 border-t border-[#1a1a1a] pt-2 space-y-2">
          <p className="text-[10px] text-slate-600 font-medium">관련 뉴스 ({news_items.length}건)</p>
          {news_items.slice(0, 2).map((item, i) => (
            <div key={i} className="space-y-0.5">
              <p className="text-[10px] text-slate-400 font-medium leading-snug line-clamp-1">{item.title}</p>
              <p className="text-[10px] text-slate-600 leading-relaxed line-clamp-2">{item.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
