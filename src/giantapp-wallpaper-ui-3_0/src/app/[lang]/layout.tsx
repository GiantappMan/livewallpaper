import { getLocaleDirection, i18n, type Locale } from "@/i18n-config";

import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@/app/styles/globals.css'
import "@/app/styles/themes.css"
import { cn } from '@/lib/utils'
import { Providers } from '@/components/providers';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { ThemeWrapper } from '@/components/theme-wrapper';
import SideMenu from '@/components/side-menu';
import { TitleBar } from '@/components/title-bar';
import { UpdatePrompt } from '@/components/update-prompt';
import { getDictionary } from "@/get-dictionary";
import { RatingDialog } from "@/components/rating-dialog";

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

//next 15 起 params 为 Promise；校验器约束 lang 为 string，运行时来自 generateStaticParams 必为 Locale
export default async function Root({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang = rawLang as Locale;
  const dictionary = await getDictionary(lang);
  return (
    <html lang={lang} dir={getLocaleDirection(lang)} suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased"
        )}
      >
        <TitleBar />
        <Providers
          lang={lang}
          dictionary={dictionary}
          attribute="class"
          // defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeWrapper>
            <div className="flex h-[calc(100vh-3rem)] bg-background">
              <SideMenu lang={lang} />

              {/* Content area */}
              <div className="flex flex-1 flex-col overflow-hidden border text-card-foreground shadow ml-1 rounded-l-lg rounded-bl-none">
                <main>
                  {children}
                  <RatingDialog />
                </main>
              </div>
            </div>
          </ThemeWrapper>
          <UpdatePrompt />
        </Providers>
        <ThemeSwitcher />
      </body>
    </html>
  );
}
