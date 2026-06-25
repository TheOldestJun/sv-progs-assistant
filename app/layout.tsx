/*
 * Root layout (обёртка всех страниц).
 * - Geist шрифты через CSS-переменные
 * - ThemeProvider + ToastProvider (клиентские контексты)
 * - Header + Footer (server components)
 * - Inline-скрипт против FOUC темы (выполняется до первого paint)
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { QueryProvider } from "@/app/providers/QueryProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

// Подключение шрифтов Geist через CSS-переменные (Tailwind v4 @theme)
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SV Progs Assistant",
  description: "SV Progs Assistant",
};

/*
 * Inline-скрипт для предотвращения flash'а темы (FOUC).
 * Выполняется до гидратации React, синхронно читает localStorage
 * и проставляет класс .dark на <html> если нужно.
 * suppressHydrationWarning на <html> — т.к. серверный рендер может
 * не совпадать с тем, что проставит скрипт на клиенте.
 */
const themeScript = `
  (function() {
    try {
      var t = localStorage.getItem('theme');
      if (t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    } catch(e) {}
  })()
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Блокирующий скрипт для темы — выполняется до первого paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <QueryProvider>
            <ToastProvider>
              <ConfirmProvider>
                <Header />
                {/* flex-1 flex flex-col чтобы main растягивался на всю высоту */}
                <main className="flex-1 flex flex-col">{children}</main>
                <Footer />
              </ConfirmProvider>
            </ToastProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
