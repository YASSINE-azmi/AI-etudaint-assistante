type PageHeaderProps = {
  eyebrow: string
  title: string
  description: string
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
      <h1 className="mt-3 font-serif text-4xl leading-[1.1] text-ink sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{description}</p>
    </header>
  )
}
