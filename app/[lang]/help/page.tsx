/*
 * Страница «Помощь» (route: /help).
 * Описание всего функционала приложения:
 * роли, создание заявок, управление статусами, работа со складом,
 * архив, поиск и пагинация.
 * Server component, без интерактива.
 */
import { getTranslations } from "next-intl/server";
import { BackLink } from "./BackLink";

export default async function HelpPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "help" });
  const tStatuses = await getTranslations({ locale: lang, namespace: "statuses" });

  const STATUSES = [
    { id: "ACCEPTED", label: tStatuses("ACCEPTED"), desc: "Заявка зарегистрирована и принята отделом снабжения" },
    { id: "INVOICE_RECEIVED", label: tStatuses("INVOICE_RECEIVED"), desc: "Поставщик выставил счёт, документ получен" },
    { id: "INVOICE_PAID", label: tStatuses("INVOICE_PAID"), desc: "Счёт оплачен, ожидается отгрузка" },
    { id: "SHIPPED", label: tStatuses("SHIPPED"), desc: "Товар отгружен, ожидается поступление на склад" },
    { id: "RECEIVED", label: tStatuses("RECEIVED"), desc: "Товар оприходован на складе — заявка выполнена" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-12 sm:px-6 lg:px-8">
      <BackLink />

      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        {t("title")}
      </h1>

      <div className="mt-8 space-y-8">
        {/* Роли */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            {t("roles.title")}
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            {t("roles.description")}
          </p>
          <ul className="mt-4 space-y-3">
            <li className="rounded-lg border border-border bg-surface p-4">
              <strong className="text-foreground">{t("roles.requester")}</strong>
              <p className="mt-1 text-sm text-text-secondary">
                {t("roles.requesterDesc")}
              </p>
            </li>
            <li className="rounded-lg border border-border bg-surface p-4">
              <strong className="text-foreground">{t("roles.headOfSupply")}</strong>
              <p className="mt-1 text-sm text-text-secondary">
                {t("roles.headOfSupplyDesc")}
              </p>
            </li>
            <li className="rounded-lg border border-border bg-surface p-4">
              <strong className="text-foreground">{t("roles.supplyDept")}</strong>
              <p className="mt-1 text-sm text-text-secondary">
                {t("roles.supplyDeptDesc")}
              </p>
            </li>
            <li className="rounded-lg border border-border bg-surface p-4">
              <strong className="text-foreground">{t("roles.warehouse")}</strong>
              <p className="mt-1 text-sm text-text-secondary">
                {t("roles.warehouseDesc")}
              </p>
            </li>
          </ul>
        </section>

        {/* Создание заявки */}
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            {t("creating.title")}
          </h2>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">{t("creating.step1")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {t("creating.step1Desc")}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">{t("creating.step2")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {t("creating.step2Desc")}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">{t("creating.step3")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {t("creating.step3Desc")}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">{t("creating.step4")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {t("creating.step4Desc")}
              </p>
            </div>
          </div>
        </section>

        {/* Статусы заявок */}
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            {t("lifecycle.title")}
          </h2>
          <p className="mt-1 leading-relaxed text-text-secondary">
            {t("lifecycle.description")}
          </p>
          <div className="mt-4 space-y-3">
            {STATUSES.map((s, i) => (
              <div
                key={s.id}
                className="flex items-start gap-4 rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 text-sm font-bold text-accent-blue">
                  {i + 1}
                </div>
                <div>
                  <strong className="text-foreground">{s.label}</strong>
                  <p className="mt-0.5 text-sm text-text-secondary">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Управление статусами */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            {t("statusChange.title")}
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            {t("statusChange.description")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{tStatuses("ACCEPTED")}</span>
            <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{tStatuses("INVOICE_RECEIVED")}</span>
            <span className="rounded-md bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">{tStatuses("INVOICE_PAID")}</span>
            <span className="rounded-md bg-cyan-100 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">{tStatuses("SHIPPED")}</span>
            <span className="rounded-md bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">{tStatuses("RECEIVED")}</span>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">{t("statusChange.howTo")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {t("statusChange.howToDesc")}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">{t("statusChange.history")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {t("statusChange.historyDesc")}
              </p>
            </div>
          </div>
        </section>

        {/* Редактирование ТМЦ */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            {t("productEdit.title")}
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            {t("productEdit.description")}
          </p>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">{t("productEdit.rename")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {t("productEdit.renameDesc")}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">{t("productEdit.replace")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {t("productEdit.replaceDesc")}
              </p>
            </div>
          </div>
        </section>

        {/* Поиск и пагинация */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            {t("search.title")}
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            {t("search.description")}
          </p>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">{t("search.search")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {t("search.searchDesc")}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">{t("search.pagination")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {t("search.paginationDesc")}
              </p>
            </div>
          </div>
        </section>

        {/* Удаление заявок */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            {t("deletion.title")}
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            {t("deletion.description")}
          </p>
          <div className="mt-3 rounded-lg border border-border bg-surface p-4">
            <h3 className="font-medium text-foreground">{t("deletion.whatHappens")}</h3>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">
              {t("deletion.whatHappensDesc")}
            </p>
          </div>
        </section>

        {/* Архив */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            {t("archive.title")}
          </h2>
          <div className="mt-3 space-y-4">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">{t("archive.view")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {t("archive.viewDesc")}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">{t("archive.filters")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {t("archive.filtersDesc")}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">{t("archive.cleanup")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {t("archive.cleanupDesc")}
              </p>
            </div>
          </div>
        </section>

        {/* Склад */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            {t("warehouse.title")}
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            {t("warehouse.description")}
          </p>
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">{t("warehouse.receiving")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {t("warehouse.receivingDesc")}
              </p>
            </div>
          </div>
        </section>

        {/* Переключение темы */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            {t("theme.title")}
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            {t("theme.description")}
          </p>
        </section>
      </div>
    </div>
  );
}
