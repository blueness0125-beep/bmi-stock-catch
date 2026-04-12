import { getAvailableDates } from "@/lib/data-server"
import HistoryClient from "./HistoryClient"

export const revalidate = 60

export default function HistoryPage() {
  const dates = getAvailableDates()
  return <HistoryClient initialDates={dates} />
}
