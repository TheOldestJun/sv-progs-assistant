/* Заглушка загрузки для /dashboard — Suspense boundary */
export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-8 border-b border-border pb-4">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-secondary" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-surface-secondary" />
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    </div>
  );
}
