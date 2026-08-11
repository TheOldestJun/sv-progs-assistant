/*
 * KitchenDashboard — дашборд «Кухня» (вкладка в дашборде снабжения).
 * Начальная версия-заглушка: структура и стили по образцу остальных дашбордов,
 * контент будет добавлен позже.
 */
"use client";

export function KitchenDashboard() {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3 sm:mb-6">
        <span className="text-2xl">🍳</span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Кухня
          </h2>
          <p className="text-sm text-text-secondary">
            Раздел для работы со снабжением кухни
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-secondary px-4 py-16 text-center">
        <span className="text-3xl" aria-hidden="true">🚧</span>
        <p className="text-sm font-medium text-foreground">
          Раздел «Кухня» в разработке
        </p>
        <p className="text-sm text-text-secondary">
          Здесь появится функциональность снабжения кухни
        </p>
      </div>
    </section>
  );
}
