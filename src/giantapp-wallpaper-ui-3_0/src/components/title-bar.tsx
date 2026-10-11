"use client";

import { useEffect, useState } from "react";
import {
  MinusIcon,
  Square2StackIcon,
  StopIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import shellApi from "@/lib/client/shell";

//自绘标题栏：顶栏为拖拽区（-webkit-app-region，配合 ShellWindow 的
//msWebView2EnableDraggableRegions 浏览器参数），窗口按钮经 shellApi 调宿主
export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    shellApi.onWindowStateChanged((state) => {
      setMaximized(state === "Maximized");
    });
  }, []);

  const toggleMaximize = () => {
    if (maximized) shellApi.restoreWindow();
    else shellApi.maximizeWindow();
  };

  const btn =
    "flex h-12 w-11 items-center justify-center text-foreground/80 transition-colors hover:bg-foreground/10";

  return (
    <div
      className="sticky top-0 z-50 flex h-12 shrink-0 select-none items-center justify-between bg-background pl-3"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <span className="text-sm font-bold text-foreground">巨应壁纸3</span>
      <div
        className="flex h-full items-center"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button className={btn} title="最小化" onClick={() => shellApi.minimizeWindow()}>
          <MinusIcon className="h-4 w-4" />
        </button>
        <button className={btn} title={maximized ? "还原" : "最大化"} onClick={toggleMaximize}>
          {maximized ? <StopIcon className="h-4 w-4" /> : <Square2StackIcon className="h-4 w-4" />}
        </button>
        <button
          className="flex h-12 w-11 items-center justify-center text-foreground/80 transition-colors hover:bg-red-500 hover:text-white"
          title="关闭"
          onClick={() => shellApi.closeWindow()}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
