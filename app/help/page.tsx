import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-8 text-sm text-text-secondary transition-colors hover:text-foreground"
      >
        &larr; На главную
      </Link>

      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Помощь
      </h1>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            О приложении
          </h2>
          <p className="mt-2 leading-relaxed text-text-secondary">
            SV Progs Assistant — это рабочее пространство для управления
            проектами и задачами.
          </p>
        </section>

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
