import { readdirSync } from "fs"
import { join } from "path"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const dataDir = join(process.cwd(), "public", "data")
    const dates = readdirSync(dataDir)
      .map((f) => {
        const m = f.match(/^jongga_v2_results_(\d{8})\.json$/)
        return m ? m[1] : null
      })
      .filter((d): d is string => d !== null)
      .sort()
      .reverse()
    return NextResponse.json({ dates, count: dates.length })
  } catch {
    return NextResponse.json({ dates: [], count: 0 })
  }
}
