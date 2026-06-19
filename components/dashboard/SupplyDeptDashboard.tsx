export function SupplyDeptDashboard() {
  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-2xl">📦</span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Отдел снабжения
          </h2>
          <p className="text-sm text-text-secondary">
            Работа с поставщиками, оформление заказов.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-surface-secondary p-6 text-center">
        <p className="text-sm text-text-secondary">Раздел в разработке</p>
      </div>
    </section>
  );
}
