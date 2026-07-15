/*
 * Главная страница (route: /).
 * Логотип + приветственный текст + кнопка «Вход» (ведёт на /login).
 * Статический server component, без интерактива.
 */
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function Home() {
  const t = await getTranslations("home");
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-8 text-center">
        <Image
          src="/logo.png"
          alt="SV Progs Assistant"
          width={120}
          height={68}
          className="rounded-lg"
          priority
        />
        <div className="max-w-lg">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            SV Progs Assistant
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-text-secondary">
            {t("welcome")}
          </p>
        </div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            {t("login")}
          </Link>
        </div>
      </div>
    </div>
  );
}
