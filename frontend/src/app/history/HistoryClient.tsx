"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Calendar } from "lucide-react"
import { api } from "@/lib/api"
import { formatDate, scoreTotal } from "@/lib/utils"
import SignalCard from "@/components/SignalCard"
import StatsRow from "@/components/StatsRow"
import type { Signal } from "@/lib/api"

interface Props {
  initialDates: string[]
}

export default function HistoryClient({ initialDates }: Props) {
  const [selectedDate, setSelectedDate] = useState(initialDates[0] ?? "")
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(false)
  const [generatedAt, setGeneratedAt] = useState("")

  useEffect(() => {
    if (!selectedDate) return
    setLoading(true)
    api
      .history(selectedDate)
      .then((res) => {
        setSignals(res.signals ?? [])
        setGeneratedAt(res.generated_at ?? "")
      })
      .catch(() => setSignals([]))
      .finally(() => setLoading(false))
  }, [selectedDate])

  const aCount = signals.filter((s) => s.grade === "A").length
  const bCount = signals.filter((s) => s.grade === "B").length
  const avgScore =
    signals.length > 0
      ? (signals.reduce((sum, s) => sum + scoreTotal(s.score), 0) / signals.length).toFixed(1)
      : "0"

  const stats = [
    { label: "시그널", value: signals.length, sub: "총 종목 수" },
    { label: "A등급", value: aCount, sub: "적극 매수", highlight: "green" as const },
    { label: "B등급", value: bCount, sub: "관심 관찰", highlight: "amber" as const },
    { label: "평균 점수", value: `${avgScore}점`, sub: "15점 만점" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">히스토리</h1>
          <p className="text-sm text-slate-500 mt-0.5">날짜별 시그널 내역</p>
        </div>

        {/* Date selector */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-[#111111] border border-[#222222] rounded-lg px-3 py-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm text-white outline-none cursor-pointer pr-1"
            >
              {initialDates.length === 0 && (
                <option value="">데이터 없음</option>
              )}
              {initialDates.map((d) => (
                <option key={d} value={d}>
                  {formatDate(d)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </div>
        </div>
      </div>

      {selectedDate && <StatsRow stats={stats} />}

      {/* Signals */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#111111] border border-[#222222] rounded-xl p-4 animate-pulse h-48" />
          ))}
        </div>
      ) : signals.length === 0 ? (
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-8 text-center">
          <p className="text-slate-500 text-sm">
            {selectedDate ? "해당 날짜에 시그널이 없습니다." : "날짜를 선택하세요."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {signals.map((s) => (
            <SignalCard key={`${s.stock_code}-${selectedDate}`} signal={s} />
          ))}
        </div>
      )}
    </div>
  )
}
