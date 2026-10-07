import { Routes, Route } from "react-router-dom";
import { Providers } from "@/components/providers";
import { ThemeWrapper } from "@/components/theme-wrapper";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { RatingDialog } from "@/components/rating-dialog";
import SideMenu from "@/components/side-menu";
import { TitleBar } from "@/components/title-bar";
import HomePage from "@/pages/home";
import HubPage from "@/pages/hub";
import DownloadsPage from "@/pages/downloads";
import CalendarPage from "@/pages/calendar";
import SettingsLayout from "@/pages/settings/layout";
import GeneralSettings from "@/pages/settings/general";
import WallpaperSettings from "@/pages/settings/wallpaper";
import AppearanceSettings from "@/pages/settings/appearance";
import UpdateSettings from "@/pages/settings/update";
import AboutPage from "@/pages/about";
import { AppUpdatePrompt } from "@/components/app-update-prompt";

export default function App() {
  return (
    <Providers>
      <ThemeWrapper>
        <div className="flex h-screen flex-col bg-background">
          <TitleBar />
          <div className="flex flex-1 overflow-hidden">
            <SideMenu />
            {/* 内容区 */}
            <div className="flex flex-1 flex-col overflow-hidden border text-card-foreground shadow ml-1 rounded-l-lg rounded-bl-none">
              <main>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/hub" element={<HubPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/downloads" element={<DownloadsPage />} />
                  <Route path="/settings" element={<SettingsLayout />}>
                    <Route index element={<GeneralSettings />} />
                    <Route path="wallpaper" element={<WallpaperSettings />} />
                    <Route path="appearance" element={<AppearanceSettings />} />
                    <Route path="update" element={<UpdateSettings />} />
                  </Route>
                  <Route path="/about" element={<AboutPage />} />
                </Routes>
                <AppUpdatePrompt />
                <RatingDialog />
              </main>
            </div>
          </div>
        </div>
      </ThemeWrapper>
      <ThemeSwitcher />
    </Providers>
  );
}
