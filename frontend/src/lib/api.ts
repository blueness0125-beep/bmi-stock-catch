/**
 * API client — works in both server (SSR) and browser (CSR).
 *
 * Server-side: uses BACKEND_URL env var → direct call to Flask API
 * Browser-side: uses relative path "/api/kr/*" → proxied via Next.js rewrites
 */

function getBase(): string {
  if (typeof window !== "undefined") {
    // Client-side: relative URL, Next.js rewrites proxy to Flask
    return ""
  }
  // Server-side: direct backend URL
  return process.env.BACKEND_URL ?? "http://localhost:5001"
}

async function fetcher<T>(path: string): Promise<T> {
  const url = `${getBase()}${path}`
  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`)
  return res.json()
}

export interface ScoreDetail {
  total: number
  news: number
  volume: number
  chart: number
  candle: number
  consolidation: number
  supply: number
  retracement: number
  pullback_support: number
  llm_reason?: string
}

export interface Signal {
  stock_code: string
  stock_name: string
  market: string
  grade: string
  score: ScoreDetail | number
  quality: number
  current_price: number
  entry_price: number
  stop_price: number
  target_price: number
  change_pct: number
  trading_value: number
  foreign_5d: number
  inst_5d: number
  quantity: number
  position_size: number
  r_value: number
  r_multiplier: number
  themes: string[]
  signal_date?: string
}

export interface SignalsResponse {
  signals: Signal[]
  count: number
  generated_at: string
}

export interface MarketGateResponse {
  date: string
  kodex200: { code: string; price: number; ma20: number; ma50: number; ma200: number }
  regime: "RISK_ON" | "NEUTRAL" | "RISK_OFF" | "UNKNOWN"
  regime_detail: { price_above_ma200: boolean | null; ma20_above_ma50: boolean | null }
  sectors: { name: string; change_pct: number }[]
}

export interface DatesResponse {
  dates: string[]
  count: number
}

export interface CumulativeResult {
  stock_code: string
  stock_name: string
  signal_date: string
  grade: string
  entry_price: number
  target_price: number
  stop_price: number
  outcome: "TARGET_HIT" | "STOP_HIT" | "OPEN"
  roi_pct: number
  days_held: number
}

export interface CumulativeStats {
  total: number
  wins: number
  losses: number
  open: number
  closed: number
  win_rate: number
  avg_roi: number
  grade_roi: Record<string, { count: number; win_rate: number; avg_roi: number }>
}

export interface CumulativeResponse {
  stats: CumulativeStats
  signals: CumulativeResult[]
  page: number
  per_page: number
  total_pages: number
}

export const api = {
  signals: () => fetcher<SignalsResponse>("/api/kr/signals"),
  marketGate: () => fetcher<MarketGateResponse>("/api/kr/market-gate"),
  dates: () => fetcher<DatesResponse>("/api/kr/jongga-v2/dates"),
  history: (date: string) => fetcher<SignalsResponse>(`/api/kr/jongga-v2/history/${date}`),
  latest: () => fetcher<SignalsResponse>("/api/kr/jongga-v2/latest"),
  cumulative: (page = 1) =>
    fetcher<CumulativeResponse>(`/api/kr/jongga-v2/cumulative?page=${page}&per_page=20`),
}
