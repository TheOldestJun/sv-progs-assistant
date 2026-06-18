/*
 * Дашбоард для пользователей (не ADMIN).
 * Показывает разный контент в зависимости от роли.
 */
import { getSession, logoutAction } from "@/app/lib/auth";
import { redirect } from "next/navigation";


const roleLabels: Record<string, string> = {
  ADMIN: "Администратор",
  HEAD_OF_SUPPLY: "Начальник снабжения",
  SUPPLY_DEPT: "Отдел снабжения",
  WAREHOUSE: "Склад",
};

const roleIcons: Record<string, string> = {
  HEAD_OF_SUPPLY: "📋",
  SUPPLY_DEPT: "📦",
  WAREHOUSE: "🏭",
};

const roleDescriptions: Record<string, string> = {
  HEAD_OF_SUPPLY: "Управление заявками на снабжение, контроль поставок.",
  SUPPLY_DEPT: "Работа с поставщиками, оформление заказов.",
  WAREHOUSE: "Приёмка товаров, учёт остатков на складе.",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { roles, name, email } = session;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Рабочий стол
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {name || email} — {roles.map((r) => roleLabels[r] || r).join(", ")}
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 text-sm font-medium text-red-600 transition-colors hover:border-red-500 hover:bg-red-100 hover:text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:border-red-600 dark:hover:bg-red-900 dark:hover:text-red-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path fillRule="evenodd" d="M17 4.25A2.25 2.25 0 0 0 14.75 2h-5.5A2.25 2.25 0 0 0 7 4.25v2a.75.75 0 0 0 1.5 0v-2a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 .75.75v11.5a.75.75 0 0 1-.75.75h-5.5a.75.75 0 0 1-.75-.75v-2a.75.75 0 0 0-1.5 0v2A2.25 2.25 0 0 0 9.25 18h5.5A2.25 2.25 0 0 0 17 15.75V4.25Z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M1 10a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5A.75.75 0 0 1 1 10Z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M8.53 6.47a.75.75 0 0 1 0 1.06L6.06 10l2.47 2.47a.75.75 0 1 1-1.06 1.06l-3-3a.75.75 0 0 1 0-1.06l3-3a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
            Выйти
          </button>
        </form>
      </div>

      <div className="grid gap-6">
        {roles.map((role) => (
          <section
            key={role}
            className="rounded-xl border border-border bg-surface p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl">{roleIcons[role] || "📌"}</span>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {roleLabels[role] || role}
                </h2>
                <p className="text-sm text-text-secondary">
                  {roleDescriptions[role] || ""}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-border bg-surface-secondary p-6 text-center">
              <p className="text-sm text-text-secondary">
                Раздел в разработке
              </p>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
