import { NextResponse } from "next/server"
import { getMarketGate } from "@/lib/market-server"

export const dynamic = "force-dynamic"
export const revalidate = 300

export async function GET() {
  const data = await getMarketGate()
  if (!data) {
    return NextResponse.json({ error: "Failed to fetch market data" }, { status: 502 })
  }
  return NextResponse.json(data)
}
