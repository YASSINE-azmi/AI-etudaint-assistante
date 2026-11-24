import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon: ReactNode
  title: string
  children: ReactNode
}

export function EmptyState({ icon, title, children }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-10 sm:px-10">
      <div className="flex max-w-xl items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          {icon}
        </span>
        <div>
          <h2 className="font-serif text-2xl text-ink">{title}</h2>
          <div className="mt-2 space-y-2 text-sm leading-6 text-muted">{children}</div>
        </div>
      </div>
    </div>
  )
}
