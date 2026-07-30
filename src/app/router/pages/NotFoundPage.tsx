export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background px-6 text-center text-foreground">
      <h1 className="font-heading text-2xl font-semibold">404</h1>
      <p className="text-sm text-muted-foreground">
        No encontramos la página que buscas.
      </p>
    </main>
  )
}
