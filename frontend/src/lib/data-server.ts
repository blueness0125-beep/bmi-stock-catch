/**
 * 서버 전용 데이터 접근 유틸리티.
 * API route 및 Server Component에서만 임포트 가능 (클라이언트 불가).
 */
import { readFileSync, readdirSync, existsSync } from "fs"
import { join } from "path"

const DATA_DIR = join(process.cwd(), "public", "data")

function readJson<T>(filename: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), "utf-8")) as T
}

export interface RawSignal {
  stock_code?: string
  code?: string
  stock_name?: string
  name?: string
  market?: string
  grade?: string
  score?: { total: number; news: number; volume: number; chart: number; candle: number; consolidation: number; supply: number; retracement: number; pullback_support: number; llm_reason?: string } | number
  quality?: number
  current_price?: number
  entry_price?: number
  stop_price?: number
  target_price?: number
  change_pct?: number
  return_pct?: number
  trading_value?: number
  foreign_5d?: number
  inst_5d?: number
  quantity?: number
  position_size?: number
  r_value?: number
  r_multiplier?: number
  themes?: string[]
  signal_date?: string
  date?: string
  status?: string
  // VCP specific
  c1?: number
  c2?: number
  c3?: number
  r12?: number
  r23?: number
  pivot_high?: number
}

// ── 종가베팅 V2 ───────────────────────────────────────────────────

export function getSignals() {
  try {
    const data = readJson<{ signals?: RawSignal[]; date?: string }>("jongga_v2_latest.json")
    const signals = (data.signals ?? []).sort((a, b) => {
      const at = typeof a.score === "number" ? a.score : a.score?.total ?? 0
      const bt = typeof b.score === "number" ? b.score : b.score?.total ?? 0
      return bt - at
    })
    return { signals, count: signals.length, generated_at: data.date ?? "" }
  } catch {
    return { signals: [], count: 0, generated_at: "" }
  }
}

export function getAvailableDates(): string[] {
  try {
    return readdirSync(DATA_DIR)
      .map((f) => { const m = f.match(/^jongga_v2_results_(\d{8})\.json$/); return m?.[1] ?? null })
      .filter((d): d is string => d !== null)
      .sort()
      .reverse()
  } catch {
    return []
  }
}

export function getHistoryByDate(date: string) {
  try {
    const path = join(DATA_DIR, `jongga_v2_results_${date}.json`)
    if (!existsSync(path)) return null
    return readJson<{ signals?: RawSignal[]; date?: string; generated_at?: string }>(
      `jongga_v2_results_${date}.json`
    )
  } catch {
    return null
  }
}

// ── VCP ──────────────────────────────────────────────────────────

export interface VCPSignal {
  code: string
  name: string
  market: string
  grade: string
  score: number
  c1: number
  c2: number
  c3: number
  r12: number
  r23: number
  pivot_high: number
  current_price: number
  entry_price?: number
  return_pct?: number
  status?: string
  foreign_5d?: number
  inst_5d?: number
}

export interface VCPData {
  date: string
  total_scanned: number
  vcp_detected: number
  signals: VCPSignal[]
}

export function getVCPSignals(): VCPData | null {
  try {
    return readJson<VCPData>("vcp_signals.json")
  } catch {
    return null
  }
}

// ── 누적 성과 ─────────────────────────────────────────────────────

export function getCumulativeStats(page = 1, perPage = 20) {
  try {
    const files = readdirSync(DATA_DIR)
      .filter((f) => /^jongga_v2_results_\d{8}\.json$/.test(f))
      .sort()

    const allSignals: RawSignal[] = []
    for (const file of files) {
      const d = readJson<{ signals?: RawSignal[] }>(file)
      allSignals.push(...(d.signals ?? []))
    }

    const results = allSignals.map((s) => ({
      stock_code: s.stock_code ?? "",
      stock_name: s.stock_name ?? "",
      signal_date: s.signal_date ?? "",
      grade: s.grade ?? "",
      entry_price: s.entry_price ?? s.current_price ?? 0,
      target_price: s.target_price ?? (s.entry_price ?? 0) * 1.09,
      stop_price: s.stop_price ?? (s.entry_price ?? 0) * 0.95,
      outcome: "OPEN" as const,
      roi_pct: 0,
      days_held: 0,
    }))

    const closed = results.filter((r) => r.outcome !== "OPEN")
    const wins = results.filter((r) => r.outcome === "TARGET_HIT" as string)
    const gradeMap: Record<string, number[]> = {}
    for (const r of closed) {
      gradeMap[r.grade] ??= []
      gradeMap[r.grade].push(r.roi_pct)
    }
    const gradeRoi: Record<string, { count: number; win_rate: number; avg_roi: number }> = {}
    for (const [g, rois] of Object.entries(gradeMap)) {
      const w = rois.filter((v) => v > 0)
      gradeRoi[g] = {
        count: rois.length,
        win_rate: rois.length ? Math.round((w.length / rois.length) * 10000) / 100 : 0,
        avg_roi: rois.length ? Math.round((rois.reduce((a, b) => a + b, 0) / rois.length) * 100) / 100 : 0,
      }
    }

    const total = results.length
    const start = (page - 1) * perPage
    return {
      stats: {
        total,
        wins: wins.length,
        losses: 0,
        open: results.filter((r) => r.outcome === "OPEN").length,
        closed: closed.length,
        win_rate: 0,
        avg_roi: 0,
        grade_roi: gradeRoi,
      },
      signals: results.slice(start, start + perPage),
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    }
  } catch {
    return null
  }
}
