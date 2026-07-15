import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) notFound();

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={lang} messages={messages}>
      <ConfirmProvider>
        <Header />
        {children}
        <Footer />
      </ConfirmProvider>
    </NextIntlClientProvider>
  );
}
