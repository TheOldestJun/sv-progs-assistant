/*
 * Header:
 * - Слева: логотип + название (скрыто на мобильных) — ведёт в дашборд или на главную
 * - Справа: ссылка "Помощь" + переключатель темы
 * - Прилипает к верху (sticky), полупрозрачный фон с блюром
 */
import Link from "next/link";
import Image from "next/image";
import { ThemeSwitcher } from "../theme/ThemeSwitcher";
import { getSession } from "@/app/lib/auth";
export async function Header() {
  const session = await getSession();
  const homeHref = session ? "/dashboard" : "/";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-header-bg backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={homeHref} className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <Image
            src="/logo.png"
            alt="SV Progs Assistant"
            width={48}
            height={48}
            priority
            className="size-12 rounded"
          />
          <span className="text-lg font-semibold tracking-tight text-foreground hidden sm:inline">
            SV Progs Assistant
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/help"
            className="flex max-sm:min-h-11 items-center rounded-md px-3 text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
          >
            Помощь
          </Link>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
