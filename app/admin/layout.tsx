/*
 * Layout админ-панели: навигация, кнопка выхода.
 */
import Link from "next/link";
import { logoutAction } from "../lib/auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Админ-панель
          </h1>
          <nav className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
            >
              Пользователи
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-text-secondary transition-colors hover:text-foreground"
          >
            На сайт
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm text-text-secondary transition-colors hover:text-foreground"
            >
              Выйти
            </button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
