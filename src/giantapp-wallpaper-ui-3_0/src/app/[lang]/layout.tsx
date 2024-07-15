import { i18n, type Locale } from "@/i18n-config";

import '@/app/styles/globals.css'
import "@/app/styles/themes.css"
import { Inter as FontSans } from "next/font/google"
import { cn } from '@/lib/utils'
import { Providers } from '@/components/providers';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { ThemeWrapper } from '@/components/theme-wrapper';
import SideMenu from '@/components/side-menu';
import { getDictionary } from "@/get-dictionary";
import { RatingDialog } from "@/components/rating-dialog";

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

export default async function Root({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: Locale };
}) {
  const dictionary = await getDictionary(params.lang);
  return (
    <html lang={params.lang} suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <Providers
          lang={params.lang}
          dictionary={dictionary}
          attribute="class"
          // defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeWrapper>
            <div className="flex h-screen bg-background">
              <SideMenu lang={params.lang} />

              {/* Content area */}
              <div className="flex flex-1 flex-col overflow-hidden border text-card-foreground shadow ml-1 rounded-l-lg rounded-bl-none">
                <main>
                  {children}
                  <RatingDialog />
                </main>
              </div>
            </div>
          </ThemeWrapper>
        </Providers>
        <ThemeSwitcher />
      </body>
    </html>
  );
}
