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
  { id: "RECEIVED", label: "Получено на склад", desc: "Товар оприходован на складе" },
  { id: "SENT_TO_REQUESTER", label: "Отправлено заявителю", desc: "Товар передан/отправлен заявителю со склада" },
  { id: "ORDER_CONFIRMED", label: "Получено заказчиком", desc: "Заявитель подтвердил получение товара" },
];

export default function HelpPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-12 sm:px-6 lg:px-8">
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
                Создание собственных заявок и отслеживание их статусов. У заявителя три вкладки:
                «Новая заявка» (упрощённая форма, заявитель привязывается автоматически),
                «Мои заявки» (просмотр со статусами + подтверждение получения позиций)
                и «Создать пропуски». Если позиция отправлена заявителю, в «Мои заявки»
                появляется кнопка подтверждения получения.
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
                Четыре вкладки: «Приёмка» (позиции со статусом «Отправлено поставщиком»,
                ожидающие поступления), «Выполнение заявок» (просмотр всех заявок),
                «Ожидание подтверждения» (список ссылок для подтверждения получения заявителями)
                и «Создать пропуски». Склад может менять статусы: «Получено на склад»,
                «Отправлено заявителю» и «Получено заказчиком» (подтверждение за заявителя).
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
            Финальные статусы: «Получено на склад», «Отправлено заявителю»,
            «Получено заказчиком» — после них изменение невозможно (кроме админа).
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
            <span className="rounded-md bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">Отправлено заявителю</span>
            <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Получено заказчиком</span>
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
            Архивация заявок
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            Заявки архивируются автоматически, когда все её позиции получили финальный
            статус: «Получено на склад», «Отправлено заявителю» или «Получено заказчиком».
            Ручное удаление также доступно — кнопка рядом с заголовком заявки.
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
            Сотрудники склада видят таблицу заявок со статусами. На вкладке «Приёмка»
            отображаются позиции со статусом «Отправлено поставщиком» и «Получено на склад»,
            ожидающие обработки.
          </p>
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">Приёмка товара</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Склад может изменить статус на «Получено на склад» или «Отправлено заявителю».
                После отправки заявителю для каждого пункта автоматически создаётся ссылка
                подтверждения получения.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">Подтверждение получения</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                После перевода позиции в статус «Отправлено заявителю» склад может
                подтвердить получение за заявителя (статья «Получено заказчиком») или
                подождать, пока заявитель подтвердит самостоятельно. На вкладке
                «Ожидание подтверждения» отображаются все ссылки для заявителей —
                их можно скопировать и повторно отправить.
              </p>
            </div>
          </div>
        </section>

        {/* Подтверждение получения заявителем */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Подтверждение получения заявителем
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            Когда склад передаёт товар заявителю, статус позиции меняется на
            «Отправлено заявителю». Заявитель видит это в разделе «Мои заявки»
            и может нажать кнопку «Подтвердить接收ение» для каждого пункта.
          </p>
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">Как подтвердить</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Откройте вкладку «Мои заявки». Позиции со статусом «Отправлено заявителю»
                будут иметь зелёную кнопку «Подтвердить接收ение». Нажмите её и подтвердите
                действие — статус изменится на «Получено заказчиком».
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">Уведомления</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Если вы — зарегистрированный пользователь системы, при входе
                появится всплывающее уведомление о заявках, ожидающих подтверждения получения.
              </p>
            </div>
          </div>
        </section>

        {/* Сообщения */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Сообщения
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            В системе есть внутренняя переписка между пользователями.
            Кнопка с конвертом ✉️ в хедере показывает количество непрочитанных сообщений.
          </p>
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">Отправка сообщения</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                В окне сообщений выберите получателя, напишите текст и нажмите Отправить.
                Также доступна страница /messages с полноценным чатом и историей переписки.
              </p>
            </div>
          </div>
        </section>

        {/* Пропуски */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Пропуски
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            На вкладке «Создать пропуски» можно сгенерировать Excel-файл пропуска
            для вывоза/ввоза товаров. Доступно снабжению, складу и заявителям.
          </p>
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">Типы пропусков</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Выберите тип: Ввоз, Вывоз или Ввоз/Вывоз. Затем укажите дату начала
                действия и добавьте позиции (ТМЦ, количество, единица измерения).
                Строки добавляются автоматически при заполнении предыдущей.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-medium text-foreground">Генерация файла</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                После заполнения всех позиций нажмите «Сохранить пропуск».
                Excel-файл будет сгенерирован по шаблону и автоматически скачан.
              </p>
            </div>
          </div>
        </section>

        {/* Оповещения склада */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Оповещения склада
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            На вкладке склада есть кнопка «Проверить поставки» — она проверяет,
            появились ли новые позиции со статусом «Отправлено поставщиком».
            При наличии новых поставок показывается всплывающее уведомление.
          </p>
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
