import { getCumulativeStats } from "@/lib/data-server"
import PerformanceClient from "./PerformanceClient"

export const revalidate = 120

export default function PerformancePage() {
  const data = getCumulativeStats(1)
  return <PerformanceClient initialData={data} />
}
