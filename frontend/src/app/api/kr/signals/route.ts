import { readFileSync } from "fs"
import { join } from "path"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function loadLatest() {
  const path = join(process.cwd(), "public", "data", "jongga_v2_latest.json")
  return JSON.parse(readFileSync(path, "utf-8"))
}

export async function GET() {
  try {
    const data = loadLatest()
    const signals = (data.signals ?? []).sort(
      (a: { score: { total: number } | number }, b: { score: { total: number } | number }) => {
        const aTotal = typeof a.score === "number" ? a.score : a.score?.total ?? 0
        const bTotal = typeof b.score === "number" ? b.score : b.score?.total ?? 0
        return bTotal - aTotal
      }
    )
    return NextResponse.json({
      signals,
      count: signals.length,
      generated_at: data.date ?? "",
      source: "json_live",
    })
  } catch {
    return NextResponse.json({ signals: [], count: 0, message: "시그널 데이터가 없습니다." })
  }
}
