"use client";

import { useState } from "react";

const MOCK_TENDERS = [
  { id: "T-001", title: "Закупка канцтоваров", status: "Ожидает предложений", date: "2026-08-15", budget: "₴ 45 000" },
  { id: "T-002", title: "Услуги по ремонту офисного помещения", status: "Предложения получены", date: "2026-08-10", budget: "₴ 120 000" },
  { id: "T-003", title: "Закупка оборудования для кухни", status: "Ожидает предложений", date: "2026-08-18", budget: "₴ 85 000" },
  { id: "T-004", title: "Страхование автотранспорта", status: "Завершено", date: "2026-07-28", budget: "₴ 32 000" },
  { id: "T-005", title: "Закупка топлива (ДП)", status: "Предложения получены", date: "2026-08-12", budget: "₴ 210 000" },
];

const STATUS_COLORS: Record<string, string> = {
  "Ожидает предложений": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  "Предложения получены": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Завершено": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const SUB_TABS = [
  { key: "all", label: "Все тендеры" },
  { key: "new", label: "Новый тендер" },
  { key: "invoices", label: "Создать счета" },
];

function AllTenders() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
            <th className="px-4 py-3">№</th>
            <th className="px-4 py-3">Название</th>
            <th className="px-4 py-3">Статус</th>
            <th className="px-4 py-3">Дата объявления</th>
            <th className="px-4 py-3 text-right">Ориентировочный бюджет</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_TENDERS.map((t) => (
            <tr key={t.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
              <td className="px-4 py-3 font-medium text-foreground">{t.id}</td>
              <td className="px-4 py-3 text-foreground">{t.title}</td>
              <td className="px-4 py-3">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status] ?? "bg-muted text-text-secondary"}`}>
                  {t.status}
                </span>
              </td>
              <td className="px-4 py-3 text-text-secondary">{t.date}</td>
              <td className="px-4 py-3 text-right font-medium text-foreground">{t.budget}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewTender() {
  return (
    <div className="rounded-lg border border-border p-6">
      <h4 className="mb-4 text-sm font-semibold text-foreground">Создание нового тендера</h4>
      <p className="text-sm text-text-secondary">Форма создания тендера — в разработке.</p>
    </div>
  );
}

function CreateInvoices() {
  return (
    <div className="rounded-lg border border-border p-6">
      <h4 className="mb-4 text-sm font-semibold text-foreground">Создание счетов</h4>
      <p className="text-sm text-text-secondary">Форма создания счетов-фактур — в разработке.</p>
    </div>
  );
}

export function TendersTab() {
  const [sub, setSub] = useState("all");

  return (
    <div>
      <div className="mb-4 border-b border-border">
        <nav className="-mb-px flex gap-1" role="tablist">
          {SUB_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={sub === t.key}
              onClick={() => setSub(t.key)}
              className={
                "px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm " +
                (sub === t.key
                  ? "border-b-2 border-accent-blue text-accent-blue"
                  : "border-b-2 border-transparent text-text-secondary hover:border-border hover:text-foreground")
              }
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-text-secondary">
          {sub === "all" && `${MOCK_TENDERS.length} тендеров`}
          {sub === "new" && "Заполните форму ниже"}
          {sub === "invoices" && "Выберите тендер для создания счета"}
        </span>
      </div>

      {sub === "all" && <AllTenders />}
      {sub === "new" && <NewTender />}
      {sub === "invoices" && <CreateInvoices />}
    </div>
  );
}
