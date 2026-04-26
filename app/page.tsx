import Link from 'next/link'
import {
  CalendarDays,
  BarChart3,
  Brain,
  Repeat2,
  WifiOff,
  GripVertical,
  ArrowRight,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: CalendarDays,
    title: 'Intelligent Scheduling',
    description:
      'Priority scoring (importance × difficulty × urgency) auto-schedules tasks into your work blocks across 28 days.',
  },
  {
    icon: GripVertical,
    title: 'Drag-to-Reorder',
    description:
      'Override the algorithm anytime. Drag sessions within a day to set your own order.',
  },
  {
    icon: BarChart3,
    title: '9 Analytics Charts',
    description:
      'Daily completions, streaks, time accuracy, workload gauge, best-hour heatmap, and momentum score.',
  },
  {
    icon: Brain,
    title: 'Smart Prediction',
    description:
      'Per-subject EWMA correction factors learn from your actual time usage and show predicted durations.',
  },
  {
    icon: Repeat2,
    title: 'Recurring Tasks',
    description:
      'Daily, weekly, specific days, or monthly recurrence with custom intervals and end dates.',
  },
  {
    icon: WifiOff,
    title: 'Works Offline',
    description:
      'All data in localStorage. No account, no server, no latency. Install as a PWA for the full native feel.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Task Flow</span>
        </div>
        <Link href="/app/home">
          <Button size="sm" variant="outline" className="gap-1.5">
            Open App <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          No account required · Works instantly
        </div>

        <h1 className="text-5xl font-bold tracking-tight max-w-2xl leading-tight mb-4">
          Your tasks, intelligently scheduled.
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl mb-8">
          Task Flow uses priority scoring and dependency-aware scheduling to fit every assignment
          into your available time — automatically.
        </p>

        <Link href="/app/home">
          <Button size="lg" className="gap-2 px-8">
            Open Task Flow <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>

        <p className="mt-4 text-xs text-muted-foreground">
          All data stored locally in your browser. Zero friction.
        </p>
      </section>

      {/* Features */}
      <section className="border-t border-border px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-center mb-10">
            Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-lg border border-border p-5 space-y-2 hover:border-foreground/20 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">{title}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="border-t border-border px-6 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight mb-3">Ready to get started?</h2>
        <p className="text-muted-foreground mb-6">No sign-up. No subscription. Just open and go.</p>
        <Link href="/app/home">
          <Button size="lg" className="gap-2 px-10">
            Open Task Flow <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>

      <footer className="border-t border-border px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Task Flow v4.0 · Built with Next.js · All data stays in your browser
        </p>
      </footer>
    </div>
  )
}
