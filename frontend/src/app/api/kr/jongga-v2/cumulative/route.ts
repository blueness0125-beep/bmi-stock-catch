import { readFileSync, existsSync, readdirSync } from "fs"
import { join } from "path"
import { NextResponse, NextRequest } from "next/server"

export const dynamic = "force-dynamic"

interface SignalRecord {
  stock_code?: string
  stock_name?: string
  grade?: string
  entry_price?: number
  current_price?: number
  target_price?: number
  stop_price?: number
  signal_date?: string
}

type Outcome = "TARGET_HIT" | "STOP_HIT" | "OPEN"

function judgeOutcome(signal: SignalRecord): {
  outcome: Outcome
  roi_pct: number
  days_held: number
  entry: number
  target: number
  stop: number
} {
  const entry = signal.entry_price ?? signal.current_price ?? 0
  const target = signal.target_price ?? entry * 1.09
  const stop = signal.stop_price ?? entry * 0.95
  return { outcome: "OPEN", roi_pct: 0, days_held: 0, entry, target, stop }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") ?? "1")
  const perPage = parseInt(searchParams.get("per_page") ?? "20")

  try {
    const dataDir = join(process.cwd(), "public", "data")
    const files = readdirSync(dataDir)
      .filter((f) => /^jongga_v2_results_\d{8}\.json$/.test(f))
      .sort()

    const allSignals: SignalRecord[] = []
    for (const file of files) {
      const data = JSON.parse(readFileSync(join(dataDir, file), "utf-8"))
      allSignals.push(...(data.signals ?? []))
    }

    const results = allSignals.map((s) => {
      const { outcome, roi_pct, days_held, entry, target, stop } = judgeOutcome(s)
      return {
        stock_code: s.stock_code ?? "",
        stock_name: s.stock_name ?? "",
        signal_date: s.signal_date ?? "",
        grade: s.grade ?? "",
        entry_price: entry,
        target_price: target,
        stop_price: stop,
        outcome,
        roi_pct,
        days_held,
      }
    })

    // Stats
    const closed = results.filter((r) => r.outcome !== "OPEN")
    const wins = results.filter((r) => r.outcome === "TARGET_HIT")
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
    const paged = results.slice(start, start + perPage)

    return NextResponse.json({
      stats: {
        total,
        wins: wins.length,
        losses: results.filter((r) => r.outcome === "STOP_HIT").length,
        open: results.filter((r) => r.outcome === "OPEN").length,
        closed: closed.length,
        win_rate: closed.length ? Math.round((wins.length / closed.length) * 10000) / 100 : 0,
        avg_roi: closed.length
          ? Math.round((closed.reduce((s, r) => s + r.roi_pct, 0) / closed.length) * 100) / 100
          : 0,
        grade_roi: gradeRoi,
      },
      signals: paged,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    })
  } catch {
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 })
  }
}
