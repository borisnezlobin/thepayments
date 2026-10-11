export function DashboardSkeleton() {
  return (
    <div aria-busy className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <span className="sr-only">Loading your shop</span>
      <div className="h-8 w-40 animate-pulse rounded-control bg-surface-sunken" />
      <div className="h-12 w-72 animate-pulse rounded-control bg-surface-sunken" />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="h-96 animate-pulse rounded-card bg-surface-sunken" />
        <div className="h-72 animate-pulse rounded-card bg-surface-sunken" />
      </div>
    </div>
  );
}
