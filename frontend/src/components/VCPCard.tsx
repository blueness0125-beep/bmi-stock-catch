import { cn, gradeBg } from "@/lib/utils"
import type { VCPSignal } from "@/lib/data-server"

interface Props {
  signal: VCPSignal
}

export default function VCPCard({ signal }: Props) {
  const {
    code, name, market, grade, score,
    c1, c2, c3, r12, r23,
    pivot_high, current_price, entry_price,
    return_pct, status,
    foreign_5d = 0, inst_5d = 0,
  } = signal

  const isClosed = status === "CLOSED"
  const isOpen = !isClosed
  const roi = return_pct ?? 0

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 hover:border-violet-500/20 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white font-semibold text-sm">{name}</span>
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-bold", gradeBg(grade))}>
              {grade}등급
            </span>
            {isClosed && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                roi >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
              )}>
                {roi >= 0 ? "익절" : "손절"}
              </span>
            )}
            {isOpen && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-medium">
                보유중
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">{code}</span>
            <span className="text-slate-700">·</span>
            <span className="text-[11px] text-slate-500">{market}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-violet-400">VCP {score}점</p>
          {roi !== 0 && (
            <p className={cn("text-xs font-bold", roi >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {roi >= 0 ? "+" : ""}{roi.toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      {/* Contraction pattern bars */}
      <div className="mb-3">
        <p className="text-[10px] text-slate-500 mb-1.5">수축 패턴 (C1 → C2 → C3)</p>
        <div className="space-y-1">
          {[
            { label: "C1", value: c1, max: Math.max(c1, c2, c3) * 1.1 },
            { label: "C2", value: c2, max: Math.max(c1, c2, c3) * 1.1 },
            { label: "C3", value: c3, max: Math.max(c1, c2, c3) * 1.1 },
          ].map(({ label, value, max }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-4">{label}</span>
              <div className="flex-1 bg-[#1a1a1a] rounded-full h-1.5">
                <div
                  className="h-full rounded-full bg-violet-500/50"
                  style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 w-8 text-right">{value.toFixed(1)}%</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-1.5">
          <span className="text-[10px] text-slate-600">R12: <span className="text-slate-400">{r12.toFixed(2)}</span></span>
          <span className="text-[10px] text-slate-600">R23: <span className="text-slate-400">{r23.toFixed(2)}</span></span>
        </div>
      </div>

      {/* Price */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <p className="text-[10px] text-slate-500 mb-0.5">피벗 고점</p>
          <p className="text-xs font-medium text-slate-300">{pivot_high?.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500 mb-0.5">현재가</p>
          <p className="text-xs font-medium text-slate-200">{current_price?.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500 mb-0.5">진입가</p>
          <p className="text-xs font-medium text-violet-300">{entry_price?.toLocaleString() ?? "-"}</p>
        </div>
      </div>

      {/* Supply */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[10px] text-slate-600">외국인 </span>
            <span className={cn("text-[10px] font-medium", foreign_5d >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {foreign_5d >= 0 ? "+" : ""}{(foreign_5d / 1000000).toFixed(0)}M
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-600">기관 </span>
            <span className={cn("text-[10px] font-medium", inst_5d >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {inst_5d >= 0 ? "+" : ""}{(inst_5d / 1000000).toFixed(0)}M
            </span>
          </div>
        </div>
        <span className="text-[10px] text-slate-500">
          돌파율 {pivot_high && current_price ? ((current_price / pivot_high) * 100).toFixed(1) : "-"}%
        </span>
      </div>
    </div>
  )
}
