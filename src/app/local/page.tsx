"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";

type Wallpaper = {
  path: string;
  busy: boolean;
};

export default function Home() {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(false);

  const show = async (item: Wallpaper) => {
    try {
      item.busy = true; // 直接修改对象属性会有警告，但我们这里为了方便就不过多解释了
      await invoke("wallpaper_open", {
        param: { path: item.path },
      });
    } catch (error) {
      console.log(error);
      alert(error); // 这里先使用 alert 代替 Vue3 中的 useMessage 组件
    } finally {
      item.busy = false;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = (await invoke("wallpaper_get_list")) as Wallpaper[];
        setWallpapers(res);
      } catch (error) {
        console.log(error);
        alert(error); // 同样先使用 alert 代替 useMessage 组件
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <div>
        local
        {loading ? (
          <p>Loading...</p>
        ) : (
          wallpapers.map((item, index) => (
            <div key={index} onClick={() => show(item)}>
              {item.path}
              {item.busy?.toString()}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
