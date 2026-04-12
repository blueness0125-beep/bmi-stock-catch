"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Target, TrendingUp, TrendingDown, Clock } from "lucide-react"
import { cn, formatDate, formatPct, outcomeColor, gradeBg } from "@/lib/utils"
import type { CumulativeResponse } from "@/lib/api"
import { api } from "@/lib/api"

interface Props {
  initialData: CumulativeResponse | null
}

const outcomeLabel: Record<string, string> = {
  TARGET_HIT: "익절",
  STOP_HIT: "손절",
  OPEN: "보유중",
}

const outcomeIcon: Record<string, React.ReactNode> = {
  TARGET_HIT: <Target className="w-3 h-3" />,
  STOP_HIT: <TrendingDown className="w-3 h-3" />,
  OPEN: <Clock className="w-3 h-3" />,
}

export default function PerformanceClient({ initialData }: Props) {
  const [data, setData] = useState(initialData)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const fetchPage = async (p: number) => {
    setLoading(true)
    const res = await api.cumulative(p).catch(() => null)
    if (res) {
      setData(res)
      setPage(p)
    }
    setLoading(false)
  }

  const stats = data?.stats
  const signals = data?.signals ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">성과분석</h1>
        <p className="text-sm text-slate-500 mt-0.5">누적 시그널 성과 통계</p>
      </div>

      {/* Top stats */}
      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#111111] border border-[#222222] rounded-xl px-4 py-3">
              <p className="text-[11px] text-slate-500 mb-1">총 시그널</p>
              <p className="text-xl font-bold text-white">{stats.total}</p>
              <p className="text-[10px] text-slate-600">종결 {stats.closed} · 보유중 {stats.open}</p>
            </div>
            <div className="bg-[#111111] border border-[#222222] rounded-xl px-4 py-3">
              <p className="text-[11px] text-slate-500 mb-1">승률</p>
              <p className={cn("text-xl font-bold", stats.win_rate >= 50 ? "text-emerald-400" : "text-rose-400")}>
                {stats.win_rate}%
              </p>
              <p className="text-[10px] text-slate-600">익절 {stats.wins} · 손절 {stats.losses}</p>
            </div>
            <div className="bg-[#111111] border border-[#222222] rounded-xl px-4 py-3">
              <p className="text-[11px] text-slate-500 mb-1">평균 수익률</p>
              <p className={cn("text-xl font-bold", stats.avg_roi >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {formatPct(stats.avg_roi)}
              </p>
              <p className="text-[10px] text-slate-600">종결 시그널 기준</p>
            </div>
            <div className="bg-[#111111] border border-[#222222] rounded-xl px-4 py-3">
              <p className="text-[11px] text-slate-500 mb-1">데이터 기간</p>
              <p className="text-xl font-bold text-white">{stats.closed}</p>
              <p className="text-[10px] text-slate-600">종결된 시그널 수</p>
            </div>
          </div>

          {/* Grade breakdown */}
          {Object.keys(stats.grade_roi ?? {}).length > 0 && (
            <div className="bg-[#111111] border border-[#222222] rounded-xl p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-3">등급별 성과</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(stats.grade_roi).map(([grade, gstats]) => (
                  <div key={grade} className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border font-bold", gradeBg(grade))}>
                        {grade}등급
                      </span>
                      <span className="text-[11px] text-slate-500">{gstats.count}개</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[11px] text-slate-500">승률</span>
                        <span className={cn("text-[11px] font-medium", gstats.win_rate >= 50 ? "text-emerald-400" : "text-rose-400")}>
                          {gstats.win_rate}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[11px] text-slate-500">평균 ROI</span>
                        <span className={cn("text-[11px] font-medium", gstats.avg_roi >= 0 ? "text-emerald-400" : "text-rose-400")}>
                          {formatPct(gstats.avg_roi)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Signal history table */}
      <div className="bg-[#111111] border border-[#222222] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#222222]">
          <h3 className="text-sm font-medium text-slate-400">시그널 이력</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">로딩 중...</div>
        ) : signals.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            데이터가 없습니다. daily_prices.csv를 추가하면 성과 분석이 가능합니다.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1a1a1a]">
                    {["날짜", "종목", "등급", "진입가", "목표가", "결과", "ROI", "보유일"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] text-slate-500 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {signals.map((s, i) => (
                    <tr
                      key={`${s.stock_code}-${s.signal_date}-${i}`}
                      className="border-b border-[#1a1a1a] hover:bg-white/2 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-[11px] text-slate-400 whitespace-nowrap">
                        {formatDate(s.signal_date?.replace(/-/g, "").slice(0, 8) ?? "")}
                      </td>
                      <td className="px-4 py-2.5">
                        <div>
                          <p className="text-xs font-medium text-white">{s.stock_name}</p>
                          <p className="text-[10px] text-slate-500">{s.stock_code}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-bold", gradeBg(s.grade))}>
                          {s.grade}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-300 whitespace-nowrap">
                        {s.entry_price?.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-300 whitespace-nowrap">
                        {s.target_price?.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className={cn("flex items-center gap-1 text-[11px] font-medium", outcomeColor(s.outcome))}>
                          {outcomeIcon[s.outcome]}
                          <span>{outcomeLabel[s.outcome] ?? s.outcome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-[11px] font-semibold", outcomeColor(s.outcome))}>
                          {s.roi_pct !== undefined ? formatPct(s.roi_pct) : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-400">
                        {s.days_held}일
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.total_pages > 1 && (
              <div className="px-4 py-3 border-t border-[#1a1a1a] flex items-center justify-between">
                <p className="text-[11px] text-slate-500">
                  {page} / {data.total_pages} 페이지 · 총 {data.stats.total}개
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchPage(page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded bg-[#1a1a1a] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => fetchPage(page + 1)}
                    disabled={page >= data.total_pages}
                    className="p-1.5 rounded bg-[#1a1a1a] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
