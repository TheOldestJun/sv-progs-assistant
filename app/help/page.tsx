/*
 * Страница «Помощь» (route: /help).
 * Описание всего функционала приложения:
 * роли, создание заявок, управление статусами, работа со складом,
 * архив, поиск и пагинация.
 * Server component, без интерактива.
 */
import { BackLink } from "./BackLink";

const STATUSES = [
  { id: "ACCEPTED", label: "Принято в работу", desc: "Заявка зарегистрирована и принята отделом снабжения" },
  { id: "INVOICE_RECEIVED", label: "Счёт получен", desc: "Поставщик выставил счёт, документ получен" },
  { id: "INVOICE_PAID", label: "Счёт оплачен", desc: "Счёт оплачен, ожидается отгрузка" },
  { id: "SHIPPED", label: "Отправлено поставщиком", desc: "Товар отгружен, ожидается поступление на склад" },
  { id: "RECEIVED", label: "Получено на склад", desc: "Товар оприходован на складе — заявка выполнена" },
];

export default function HelpPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6 lg:px-8">
      <BackLink />

      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Помощь
      </h1>

      <div className="mt-8 space-y-8">
        {/* Роли */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Роли в системе
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            В зависимости от вашей роли вам доступны разные разделы. Если у вас несколько ролей,
            на странице дашборда отображаются вкладки для переключения между ними.
          </p>
          <ul className="mt-4 space-y-3">
            <li className="rounded-lg border border-border bg-surface p-4">
              <strong className="text-foreground">Заявитель</strong>
              <p className="mt-1 text-sm text-text-secondary">
                Создание собственных заявок и отслеживание их статусов. У заявителя две вкладки:
                «Новая заявка» (упрощённая форма, заявитель привязывается автоматически)
                и «Мои заявки» (просмотр без возможности изменения статусов).
              </p>
            </li>
            <li className="rounded-lg border border-border bg-surface p-4">
              <strong className="text-foreground">Начальник снабжения</strong>
              <p className="mt-1 text-sm text-text-secondary">
                Создание новых заявок на снабжение. Просмотр и управление статусами всех заявок.
              </p>
            </li>
            <li className="rounded-lg border border-border bg-surface p-4">
              <strong className="text-foreground">Отдел снабжения</strong>
              <p className="mt-1 text-sm text-text-secondary">
                Просмотр всех заявок, изменение статусов по мере выполнения закупки.
              </p>
            </li>
            <li className="rounded-lg border border-border bg-surface p-4">
              <strong className="text-foreground">Склад</strong>
              <p className="mt-1 text-sm text-text-secondary">
                Две вкладки: «Приёмка» (позиции со статусом «Отправлено поставщиком»,
                ожидающие поступления) и «Выполнение заявок» (просмотр всех заявок
                без возможности изменения статусов, кроме отметки о получении).
                Склад может менять статус только на «Получено на склад».
              </p>
            </li>
          </ul>
        </section>

        {/* Создание заявки */}
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            Создание заявки
          </h2>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">1. Заявитель и дата</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Введите ФИО сотрудника, подающего заявку. Можно найти существующего заявителя
                через автокомплит (начните печатать) или создать нового, нажав
                «Добавить». Дата заполняется автоматически текущим днём.
                Если вы заявитель — заявитель привязывается автоматически, поле выбора скрыто.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">2. Позиции заявки</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Для каждой позиции укажите ТМЦ, единицу измерения и количество.
                ТМЦ и единицы измерения можно создавать на лету через автокомплит —
                если введённого названия нет в списке, появится кнопка
                «Добавить». Чтобы добавить новую строку, нажмите
                «Добавить позицию».
              </p>
            </div>

            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">3. Комментарий к позиции</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Под каждой позицией есть поле для комментария. Укажите важные уточнения:
                бренд, цвет, технические характеристики, срочность. Комментарий отображается
                в таблице заявок в виде синей иконки рядом с названием ТМЦ.
                Подробности видны при раскрытии позиции.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">4. Отправка</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Нажмите «Отправить заявку». После успешной отправки форма очистится,
                а заявка появится в таблице.
              </p>
            </div>
          </div>
        </section>

        {/* Статусы заявок */}
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            Жизненный цикл заявки
          </h2>
          <p className="mt-1 leading-relaxed text-text-secondary">
            Каждая позиция в заявке проходит последовательные статусы.
            Переход между статусами выполняют сотрудники отдела снабжения и склада.
            Статус «Получено на склад» финальный — после него изменение невозможно.
            При смене статуса можно указать дату изменения (по умолчанию — текущая).
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
            Изменение статуса позиции
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            В таблице заявок напротив каждой позиции отображается текущий статус
            в виде цветного бейджа:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Принято в работу</span>
            <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Счёт получен</span>
            <span className="rounded-md bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">Счёт оплачен</span>
            <span className="rounded-md bg-cyan-100 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">Отправлено поставщиком</span>
            <span className="rounded-md bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">Получено на склад</span>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">Как изменить статус</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Нажмите на цветной бейдж статуса — откроется выпадающий список с
                доступными статусами. Выберите нужный — появится окно подтверждения,
                где можно указать дату изменения (по умолчанию — сегодня).
                Система запишет изменение в историю с указанием даты и имени сотрудника.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">Просмотр истории</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Нажмите на название ТМЦ в таблице — раскроется панель с историей
                изменений статуса и комментарием к позиции (если он был указан).
                В истории видно: старый статус → новый статус, кто изменил и когда.
              </p>
            </div>
          </div>
        </section>

        {/* Редактирование ТМЦ */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Редактирование ТМЦ в позиции
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            Сотрудники отдела снабжения и склада могут изменить ТМЦ в любой позиции
            заявки (кроме режима просмотра). Рядом с названием ТМЦ есть кнопка с
            карандашом ✏️, которая открывает окно редактирования.
          </p>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">Переименовать</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Можно исправить название ТМЦ (например, опечатку). Новое название
                сохранится для всех заявок, использующих этот ТМЦ.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">Заменить ТМЦ</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Можно заменить ТМЦ на другой из списка через автокомплит. Если нужного
                ТМЦ нет в списке — введите название и нажмите «Создать и заменить».
              </p>
            </div>
          </div>
        </section>

        {/* Поиск и пагинация */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Поиск и пагинация
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            В таблице заявок доступны поиск и пагинация для удобной навигации
            при большом количестве заявок.
          </p>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">Поиск</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Поле поиска фильтрует заявки по ФИО заявителя или названию продукта.
                Результаты обновляются по мере ввода.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">Пагинация</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Заявки отображаются по 10 на страницу. Под таблицей расположены кнопки
                «Назад», «Вперёд» и номера страниц.
              </p>
            </div>
          </div>
        </section>

        {/* Удаление заявок */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Удаление заявок
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            Заявку можно удалить только после того, как все её позиции получили статус
            «Получено на склад». Кнопка удаления находится справа от заголовка заявки.
          </p>
          <div className="mt-3 rounded-lg border border-border bg-surface p-4">
            <h3 className="font-medium text-foreground">Что происходит при удалении</h3>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">
              Заявка не удаляется безвозвратно — она перемещается в архив.
              Архивные заявки доступны для просмотра на вкладке «Архив».
            </p>
          </div>
        </section>

        {/* Архив */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Архив
          </h2>
          <div className="mt-3 space-y-4">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">Просмотр архива</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Вкладка «Архив» доступна на дашборде.
                В архиве отображаются все удалённые заявки. Каждую архивную запись можно
                раскрыть, чтобы увидеть список позиций на момент удаления.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">Фильтры в архиве</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Для поиска в архиве можно отфильтровать записи по заявителю
                и по диапазону дат (от/до).
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">Автоматическая очистка</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Записи старше 3 лет автоматически удаляются при просмотре архива.
              </p>
            </div>
          </div>
        </section>

        {/* Склад */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Работа склада
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            Сотрудники склада видят таблицу заявок со статусами. На вкладке склада
            отображаются только позиции со статусом «Отправлено поставщиком»,
            ожидающие поступления.
          </p>
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">Приёмка товара</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Склад может изменить статус позиции только на «Получено на склад».
                Остальные статусы недоступны. После получения статус становится финальным
                и не подлежит изменению.
              </p>
            </div>
          </div>
        </section>

        {/* Переключение темы */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Переключение темы
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            В правой части хедера расположен переключатель темы. Вы можете
            выбрать светлую, тёмную или системную тему (автоматически следует
            настройкам вашей ОС).
          </p>
        </section>
      </div>
    </div>
  );
}
