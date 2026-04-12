import { RefreshCw } from "lucide-react"
import { api } from "@/lib/api"
import { formatDate, scoreTotal } from "@/lib/utils"
import SignalCard from "@/components/SignalCard"
import MarketGateBadge from "@/components/MarketGateBadge"
import StatsRow from "@/components/StatsRow"
import SectorList from "@/components/SectorList"

export const revalidate = 60

export default async function DashboardPage() {
  const [signalsRes, marketRes] = await Promise.allSettled([
    api.signals(),
    api.marketGate(),
  ])

  const signalsData = signalsRes.status === "fulfilled" ? signalsRes.value : null
  const marketData = marketRes.status === "fulfilled" ? marketRes.value : null

  const signals = signalsData?.signals ?? []
  const aCount = signals.filter((s) => s.grade === "A").length
  const bCount = signals.filter((s) => s.grade === "B").length
  const avgScore =
    signals.length > 0
      ? (signals.reduce((sum, s) => sum + scoreTotal(s.score), 0) / signals.length).toFixed(1)
      : "0"

  const stats = [
    { label: "오늘 시그널", value: signals.length, sub: "총 종목 수", highlight: "default" as const },
    { label: "A등급", value: aCount, sub: "적극 매수", highlight: "green" as const },
    { label: "B등급", value: bCount, sub: "관심 관찰", highlight: "amber" as const },
    { label: "평균 점수", value: `${avgScore}점`, sub: "15점 만점", highlight: "default" as const },
  ]

  const today = signalsData?.generated_at
    ? formatDate(signalsData.generated_at.replace(/-/g, "").slice(0, 8))
    : "—"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">대시보드</h1>
          <p className="text-sm text-slate-500 mt-0.5">{today} 기준 최신 시그널</p>
        </div>
        <div className="flex items-center gap-3">
          <MarketGateBadge
            data={marketData}
            error={marketRes.status === "rejected"}
          />
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <RefreshCw className="w-3 h-3" />
            <span>60초 캐시</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <StatsRow stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signal cards */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-medium text-slate-400">시그널 목록</h2>
          {signals.length === 0 ? (
            <div className="bg-[#111111] border border-[#222222] rounded-xl p-8 text-center">
              <p className="text-slate-500 text-sm">오늘 시그널이 없습니다.</p>
              <p className="text-slate-600 text-xs mt-1">엔진을 실행하여 데이터를 수집하세요.</p>
            </div>
          ) : (
            signals.map((s) => (
              <SignalCard key={`${s.stock_code}-${s.signal_date ?? "latest"}`} signal={s} />
            ))
          )}
        </div>

        {/* Market gate details */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-400">시장 국면</h2>
          {marketData ? (
            <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 space-y-4">
              {/* KODEX 200 */}
              <div>
                <p className="text-[11px] text-slate-500 mb-2">KODEX 200 이동평균</p>
                <div className="space-y-1.5">
                  {[
                    { label: "현재가", value: marketData.kodex200.price?.toLocaleString() ?? "-" },
                    { label: "MA20", value: marketData.kodex200.ma20?.toLocaleString() ?? "-" },
                    { label: "MA50", value: marketData.kodex200.ma50?.toLocaleString() ?? "-" },
                    { label: "MA200", value: marketData.kodex200.ma200?.toLocaleString() ?? "-" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-[11px] text-slate-500">{label}</span>
                      <span className="text-[11px] font-medium text-slate-300">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sector list */}
              <div>
                <p className="text-[11px] text-slate-500 mb-2">업종별 등락률 Top 8</p>
                <SectorList sectors={marketData.sectors ?? []} />
              </div>
            </div>
          ) : (
            <div className="bg-[#111111] border border-[#222222] rounded-xl p-4">
              <p className="text-sm text-slate-500">시장 데이터를 불러오는 중...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
