import { RefreshCw, Activity, TrendingUp, Tag } from "lucide-react"
import { getSignals, getVCPSignals } from "@/lib/data-server"
import { getMarketGate } from "@/lib/market-server"
import { formatDate, scoreTotal } from "@/lib/utils"
import SignalCard from "@/components/SignalCard"
import MarketGateBadge from "@/components/MarketGateBadge"
import StatsRow from "@/components/StatsRow"
import SectorList from "@/components/SectorList"
import VCPCard from "@/components/VCPCard"
import type { Signal } from "@/lib/api"

export const revalidate = 60

function GradeBar({ grade, count, total }: { grade: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  const color = grade === "A" ? "bg-emerald-500" : grade === "B" ? "bg-amber-500" : "bg-slate-500"
  const text = grade === "A" ? "text-emerald-400" : grade === "B" ? "text-amber-400" : "text-slate-400"
  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] font-bold w-4 ${text}`}>{grade}</span>
      <div className="flex-1 bg-[#1a1a1a] rounded-full h-1.5">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-400 w-3 text-right">{count}</span>
    </div>
  )
}

export default async function DashboardPage() {
  const signalsData = getSignals()
  const vcpData = getVCPSignals()
  const marketData = await getMarketGate()

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

  // Themes aggregation
  const themeMap: Record<string, number> = {}
  for (const s of signals) {
    for (const t of (s as unknown as { themes?: string[] }).themes ?? []) {
      themeMap[t] = (themeMap[t] ?? 0) + 1
    }
  }
  const topThemes = Object.entries(themeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Grade/market distribution from top-level JSON
  const byGrade = signalsData.by_grade
  const byMarket = signalsData.by_market
  const gradeTotal = Object.values(byGrade).reduce((a, b) => a + b, 0)
  const gradeOrder = ["A", "B", "C"]

  const processingSeconds = (signalsData.processing_time_ms / 1000).toFixed(1)

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
        <div className="flex items-center gap-2 flex-wrap">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">종가베팅 V2</h2>
          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
            8항목 15점 스코어링
          </span>
          {signalsData.total_candidates > 0 && (
            <span className="text-[11px] text-slate-500 ml-1">
              {signalsData.total_candidates}개 스캔 → {signalsData.filtered_count}개 통과 · {processingSeconds}초
            </span>
          )}
        </div>

        <StatsRow stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {signals.length === 0 ? (
              <div className="bg-[#111111] border border-[#222222] rounded-xl p-8 text-center">
                <p className="text-slate-400 text-sm font-medium">오늘 시그널이 없습니다.</p>
                <p className="text-slate-600 text-xs mt-1.5">
                  {signalsData.total_candidates > 0
                    ? `${signalsData.total_candidates}개 후보 중 품질 게이트를 통과한 종목이 없습니다.`
                    : "엔진을 실행하여 데이터를 수집하세요."}
                </p>
              </div>
            ) : (
              signals.map((s) => (
                <SignalCard key={`${s.stock_code}-${s.signal_date ?? "latest"}`} signal={s} />
              ))
            )}
          </div>

          {/* Right panel: Market gate + Grade/Market dist + Themes */}
          <div className="space-y-4">
            {/* Grade distribution — always visible */}
            <div className="bg-[#111111] border border-[#222222] rounded-xl p-4">
              <p className="text-[11px] text-slate-500 mb-3 font-medium">등급 분포</p>
              <div className="space-y-2">
                {gradeOrder.map((g) => (
                  <GradeBar key={g} grade={g} count={byGrade[g] ?? 0} total={Math.max(gradeTotal, 1)} />
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[#1a1a1a] flex gap-3">
                {Object.keys(byMarket).length > 0 ? (
                  Object.entries(byMarket).map(([market, cnt]) => (
                    <span key={market} className="text-[10px] text-slate-400">
                      {market} <span className="text-white font-semibold">{cnt}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-600">시장 데이터 없음</span>
                )}
              </div>
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
        </div>
      </section>

      {/* ── 테마 집계 ──────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-white">테마 집계</h2>
          <span className="text-[10px] px-1.5 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full">
            오늘 시그널 기반
          </span>
        </div>
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-4">
          {topThemes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {topThemes.map(([theme, count]) => (
                <div
                  key={theme}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]"
                >
                  <span className="text-xs text-slate-300">{theme}</span>
                  <span className="text-[10px] px-1 py-0.5 bg-sky-500/10 text-sky-400 rounded font-semibold">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-2">
              오늘 시그널이 없어 집계할 테마가 없습니다.
            </p>
          )}
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
