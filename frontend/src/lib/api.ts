/**
 * API client — 항상 상대 경로 사용.
 * 서버 컴포넌트(SSR): Next.js 내부 API route 호출
 * 클라이언트 컴포넌트(CSR): 동일
 *
 * 모든 API는 frontend/src/app/api/kr/ 아래에 구현되어 있으며,
 * Flask 백엔드 없이 Vercel 단독으로 동작합니다.
 */

async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
  // SSR에서는 절대 URL이 필요하므로 NEXTAUTH_URL 또는 localhost 사용
  const base =
    typeof window === "undefined"
      ? (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000")
      : ""

  const url = `${base}${path}`
  const res = await fetch(url, { next: { revalidate: 60 }, ...init })
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

export interface Checklist {
  mandatory: {
    has_news: boolean
    news_sources: string[]
    volume_sufficient: boolean
  }
  optional: {
    is_new_high: boolean
    is_breakout: boolean
    ma_aligned: boolean
    good_candle: boolean
    upper_wick_long: boolean
    has_consolidation: boolean
    supply_positive: boolean
    retracement_recovery: boolean
    pullback_support_confirmed: boolean
  }
  negative: {
    negative_news: boolean
  }
}

export interface NewsItem {
  title: string
  summary: string
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
  checklist?: Checklist
  news_items?: NewsItem[]
}

export interface SignalsResponse {
  signals: Signal[]
  count: number
  generated_at: string
}

export interface MarketGateResponse {
  date: string
  kodex200: { code: string; price: number; ma20: number | null; ma50: number | null; ma200: number | null }
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
