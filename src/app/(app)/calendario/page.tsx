import type { Metadata } from 'next'
import { CalendarView } from './_components/CalendarView'

export const metadata: Metadata = { title: 'Calendario' }

export default function CalendarioPage() {
  return <CalendarView />
}
