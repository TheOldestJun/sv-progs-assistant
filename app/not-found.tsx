/*
 * 404 — страница не найдена (root level, outside [lang] layout).
 * Cannot use next-intl here since it's outside the locale provider.
 */
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-bold text-primary/20">404</p>
      <h1 className="mt-4 text-2xl font-bold text-foreground">
        Страница не найдена
      </h1>
      <p className="mt-2 leading-relaxed text-text-secondary">
        Запрашиваемая страница не существует или была перемещена.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex max-sm:min-h-11 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        На главную
      </Link>
    </div>
  );
}
