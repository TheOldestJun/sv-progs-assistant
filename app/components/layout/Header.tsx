import Link from "next/link";
import Image from "next/image";
import { ThemeSwitcher } from "../theme/ThemeSwitcher";

/*
 * Header:
 * - Слева: логотип + название (скрыто на мобильных)
 * - Справа: ссылка "Помощь" + переключатель темы
 * - Прилипает к верху (sticky), полупрозрачный фон с блюром
 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-header-bg backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <Image
            src="/logo.png"
            alt="SV Progs Assistant"
            width={48}
            height={48}
            className="size-12 rounded"
          />
          <span className="text-lg font-semibold tracking-tight text-foreground hidden sm:inline">
            SV Progs Assistant
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/help"
            className="text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
          >
            Помощь
          </Link>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
