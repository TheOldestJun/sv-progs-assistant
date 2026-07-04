/*
 * Страница /dashboard — рабочий стол в зависимости от роли.
 * - Определяет компоненты для каждой роли через dashboardComponents
 * - Если роль одна — рендерит её напрямую
 * - Если несколько — рендерит вкладки (DashboardTabs)
 * - Кнопка «Выйти» с красным стилем
 */
import { getSession, logoutAction } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { HeadOfSupplyDashboard } from "@/components/dashboard/HeadOfSupplyDashboard";
import { SupplyDeptDashboard } from "@/components/dashboard/SupplyDeptDashboard";
import { WarehouseDashboard } from "@/components/dashboard/WarehouseDashboard";
import { RequesterDashboard } from "@/components/dashboard/RequesterDashboard";
import { ArchiveDashboard } from "@/components/dashboard/ArchiveDashboard";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const ARCHIVE_TAB = { role: "__archive__", label: "Архив", icon: "🗃️" };

const roleMeta: Record<string, { label: string; icon: string }> = {
  ADMIN: { label: "Администратор", icon: "⚙" },
  HEAD_OF_SUPPLY: { label: "Начальник снабжения", icon: "📋" },
  SUPPLY_DEPT: { label: "Отдел снабжения", icon: "📦" },
  WAREHOUSE: { label: "Склад", icon: "🏭" },
  REQUESTER: { label: "Заявитель", icon: "📝" },
};

const dashboardComponents: Record<string, React.ElementType> = {
  HEAD_OF_SUPPLY: HeadOfSupplyDashboard,
  SUPPLY_DEPT: SupplyDeptDashboard,
  WAREHOUSE: WarehouseDashboard,
  REQUESTER: RequesterDashboard,
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { roles, name, email } = session;
  const dashboards = roles.filter((r) => dashboardComponents[r]);
  const isAdmin = roles.includes("ADMIN");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Рабочий стол
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {name || email} — {roles.map((r) => roleMeta[r]?.label || r).join(", ")}
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 text-sm font-medium text-red-600 transition-colors hover:border-red-500 hover:bg-red-100 hover:text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:border-red-600 dark:hover:bg-red-900 dark:hover:text-red-300"
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

      {dashboards.length === 0 ? (
        <p className="text-center text-sm text-text-secondary">
          Нет доступных разделов для вашей роли
        </p>
      ) : (
        (() => {
          const tabs: { role: string; label: string; icon: string }[] = dashboards.map((r) => ({
            role: r,
            label: roleMeta[r]?.label || r,
            icon: roleMeta[r]?.icon || "📄",
          }));

          const components = dashboards.map((role) => {
            const Component = dashboardComponents[role];
            return (
              <ErrorBoundary key={role}>
                <Component />
              </ErrorBoundary>
            );
          });

          // Архив для всех не-админов
          if (!isAdmin) {
            tabs.push(ARCHIVE_TAB);
            components.push(
              <ErrorBoundary key="archive">
                <ArchiveDashboard />
              </ErrorBoundary>,
            );
          }

          if (tabs.length === 1) {
            return components[0];
          }

          return (
            <DashboardTabs tabs={tabs}>
              {components}
            </DashboardTabs>
          );
        })()
      )}
    </div>
  );
}
