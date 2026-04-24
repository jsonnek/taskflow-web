import { Sidebar } from '@/components/layout/Sidebar'
import { QuickCapture } from '@/components/layout/QuickCapture'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <QuickCapture />
    </div>
  )
}
