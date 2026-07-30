export function FoundationHomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <span className="rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Foundation
      </span>
      <h1 className="font-heading text-3xl font-semibold sm:text-4xl">
        SGEB frontend foundation is running
      </h1>
      <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
        This is a temporary placeholder page. Business screens (login, dashboards,
        admin/capitán console, comensal experience) are not part of this technical
        foundation and will be built feature by feature — see{' '}
        <code className="rounded bg-muted px-1 py-0.5">docs/FrontendArchitecture.md</code>
        .
      </p>
    </main>
  )
}
