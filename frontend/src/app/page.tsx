import { RefreshCw, Activity, TrendingUp } from "lucide-react"
import { getSignals, getVCPSignals } from "@/lib/data-server"
import { formatDate, scoreTotal } from "@/lib/utils"
import SignalCard from "@/components/SignalCard"
import MarketGateBadge from "@/components/MarketGateBadge"
import StatsRow from "@/components/StatsRow"
import SectorList from "@/components/SectorList"
import VCPCard from "@/components/VCPCard"
import type { Signal } from "@/lib/api"
import type { MarketGateResponse } from "@/lib/api"

export const revalidate = 60

async function fetchMarketGate(): Promise<MarketGateResponse | null> {
  try {
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
    const res = await fetch(`${base}/api/kr/market-gate`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const signalsData = getSignals()
  const vcpData = getVCPSignals()
  const marketData = await fetchMarketGate()

  const signals = signalsData.signals as unknown as Signal[]
  const aCount = signals.filter((s) => s.grade === "A").length
  const bCount = signals.filter((s) => s.grade === "B").length
  const avgScore =
    signals.length > 0
      ? (signals.reduce((sum, s) => sum + scoreTotal(s.score), 0) / signals.length).toFixed(1)
      : "0"

  const stats = [
    { label: "오늘 시그널", value: signals.length, sub: "종가베팅 V2", highlight: "default" as const },
    { label: "A등급", value: aCount, sub: "적극 매수", highlight: "green" as const },
    { label: "B등급", value: bCount, sub: "관심 관찰", highlight: "amber" as const },
    { label: "평균 점수", value: `${avgScore}점`, sub: "15점 만점", highlight: "default" as const },
  ]

  const today = signalsData.generated_at
    ? formatDate(signalsData.generated_at.replace(/-/g, "").slice(0, 8))
    : "—"

  const vcpSignals = vcpData?.signals ?? []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">대시보드</h1>
          <p className="text-sm text-slate-500 mt-0.5">{today} 기준 최신 시그널</p>
        </div>
        <div className="flex items-center gap-3">
          <MarketGateBadge data={marketData} error={!marketData} />
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <RefreshCw className="w-3 h-3" />
            <span>60초 캐시</span>
          </div>
        </div>
      </div>

      {/* ── 종가베팅 V2 ──────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">종가베팅 V2</h2>
          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
            8항목 15점 스코어링
          </span>
        </div>

        <StatsRow stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
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

          {/* Market gate panel */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-400">시장 국면</h3>
            {marketData ? (
              <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 space-y-4">
                <div>
                  <p className="text-[11px] text-slate-500 mb-2">KODEX 200 이동평균</p>
                  <div className="space-y-1.5">
                    {[
                      { label: "현재가", value: marketData.kodex200?.price?.toLocaleString() ?? "-" },
                      { label: "MA20", value: marketData.kodex200?.ma20?.toLocaleString() ?? "-" },
                      { label: "MA50", value: marketData.kodex200?.ma50?.toLocaleString() ?? "-" },
                      { label: "MA200", value: marketData.kodex200?.ma200?.toLocaleString() ?? "-" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-[11px] text-slate-500">{label}</span>
                        <span className="text-[11px] font-medium text-slate-300">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
      </section>

      {/* ── VCP 스캐너 ──────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">VCP 스캐너</h2>
          <span className="text-[10px] px-1.5 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
            Volatility Contraction Pattern
          </span>
          {vcpData && (
            <span className="text-[11px] text-slate-500 ml-1">
              {vcpData.total_scanned}개 스캔 · {vcpData.vcp_detected}개 감지
            </span>
          )}
        </div>

        {vcpSignals.length === 0 ? (
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 text-center">
            <p className="text-slate-500 text-sm">VCP 시그널이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {vcpSignals.map((s) => (
              <VCPCard key={s.code} signal={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
