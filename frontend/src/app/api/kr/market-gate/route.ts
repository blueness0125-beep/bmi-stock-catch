import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 300

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://finance.naver.com/",
  "Accept-Language": "ko-KR,ko;q=0.9",
}

function parseKRInt(val: string): number {
  return Number(val.replace(/,/g, "")) || 0
}

async function fetchChartCloses(code: string, days: number): Promise<number[]> {
  const rows: number[] = []
  let page = 1
  const baseUrl = `https://finance.naver.com/item/sise_day.naver?code=${code}`

  while (rows.length < days && page <= 12) {
    const res = await fetch(`${baseUrl}&page=${page}`, {
      headers: { ...HEADERS, Referer: baseUrl },
      next: { revalidate: 300 },
    })
    if (!res.ok) break

    const html = await res.arrayBuffer()
    const text = new TextDecoder("euc-kr").decode(html)

    const trMatches = text.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)
    let found = false
    for (const match of trMatches) {
      const tds = [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      if (tds.length < 7) continue
      const dateText = tds[0][1].replace(/<[^>]+>/g, "").trim()
      if (!dateText || !/\d{4}/.test(dateText)) continue
      const closeText = tds[1][1].replace(/<[^>]+>/g, "").trim()
      const close = parseKRInt(closeText)
      if (close > 0) {
        rows.push(close)
        found = true
      }
      if (rows.length >= days) break
    }
    if (!found) break
    page++
  }

  return rows.reverse()
}

async function fetchSectors(): Promise<{ name: string; change_pct: number }[]> {
  const res = await fetch(
    "https://finance.naver.com/sise/sise_group.naver?type=upjong",
    { headers: HEADERS, next: { revalidate: 300 } }
  )
  if (!res.ok) return []

  const html = await res.arrayBuffer()
  const text = new TextDecoder("euc-kr").decode(html)
  const sectors: { name: string; change_pct: number }[] = []

  const rowMatches = text.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)
  for (const match of rowMatches) {
    const tds = [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
    if (tds.length < 2) continue
    const aMatch = tds[0][1].match(/>([^<]+)</)
    if (!aMatch) continue
    const name = aMatch[1].trim()
    const changeTxt = tds[1][1].replace(/<[^>]+>/g, "").trim().replace("%", "")
    const change_pct = parseFloat(changeTxt) || 0
    if (name) sectors.push({ name, change_pct })
  }

  return sectors.sort((a, b) => b.change_pct - a.change_pct)
}

function calcMA(closes: number[], window: number): number | null {
  if (closes.length < window) return null
  const slice = closes.slice(-window)
  return Math.round(slice.reduce((a, b) => a + b, 0) / window)
}

export async function GET() {
  try {
    const [closes, sectors] = await Promise.all([
      fetchChartCloses("069500", 220),
      fetchSectors(),
    ])

    if (!closes.length) {
      return NextResponse.json({ error: "Failed to fetch KODEX 200 data" }, { status: 502 })
    }

    const currentPrice = closes[closes.length - 1]
    const ma20 = calcMA(closes, 20)
    const ma50 = calcMA(closes, 50)
    const ma200 = calcMA(closes, 200)

    let regime: "RISK_ON" | "RISK_OFF" | "NEUTRAL" | "UNKNOWN" = "UNKNOWN"
    if (ma200 && ma50 && ma20) {
      if (currentPrice > ma200 && ma20 > ma50) regime = "RISK_ON"
      else if (currentPrice < ma200 && ma20 < ma50) regime = "RISK_OFF"
      else regime = "NEUTRAL"
    }

    return NextResponse.json({
      date: new Date().toISOString().slice(0, 10),
      kodex200: { code: "069500", price: currentPrice, ma20, ma50, ma200 },
      regime,
      regime_detail: {
        price_above_ma200: ma200 ? currentPrice > ma200 : null,
        ma20_above_ma50: ma20 && ma50 ? ma20 > ma50 : null,
      },
      sectors,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
