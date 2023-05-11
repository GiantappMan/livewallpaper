"use client";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import { Bars3Icon } from "@heroicons/react/24/outline";
interface WallpaperConfig {
  paths: string[];
}

const Wallpaper = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [config, setConfig] = useState<WallpaperConfig>({ paths: [] });

  const loadConfig = async () => {
    setLoading(true);
    try {
      const originalConfig = await invoke("settings_load_wallpaper");
      setConfig(JSON.parse(JSON.stringify(originalConfig)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const saveConfig = async () => {
    //paths去重
    if (config) {
      config.paths = config.paths.filter((item, index, self) => {
        return self.indexOf(item) === index;
      });
    }

    try {
      setLoading(true);
      const savedConfig = await invoke("settings_save_wallpaper", { config });
      setConfig(JSON.parse(JSON.stringify(savedConfig)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const removePath = async (index: number) => {
    config.paths.splice(index, 1);
    await saveConfig();
  };

  const choosePath = async () => {
    if (!config) return;

    const selected = (await open({
      directory: true,
    })) as string;

    if (selected) {
      config.paths.push(selected);
      await saveConfig();
    }
  };

  return (
    <div className="mx-auto max-w-3xl py-10 px-4 sm:px-6 lg:py-12 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-200">壁纸</h1>
      <div className="divide-y-blue-gray-200 mt-6 space-y-8 divide-y">
        <div className="grid grid-cols-1 gap-y-6">
          <div className="col-span-6">
            <h2 className="text-xl font-medium text-gray-200">壁纸位置</h2>
            <p className="mt-1 text-sm text-gray-300">
              支持从多个路径读取壁纸，保存时会按顺序查找第一个可用目录。
            </p>
          </div>
          <div className="col-span-6">
            {config.paths.map((path: string, index: number) => (
              <div key={index} className="mb-1">
                <Bars3Icon className="w-8 h-8 text-white mr-2 handle self-center cursor-pointer" />
                <input
                  type="text"
                  className="border rounded-lg mr-2 text-white bg-gray-700"
                  value={path}
                  onChange={(event) => {
                    config.paths[index] = event.target.value;
                    setConfig(JSON.parse(JSON.stringify(config)));
                  }}
                  onBlur={saveConfig}
                />
                <button
                  type="button"
                  className="text-white bg-red-500 rounded-md"
                  onClick={() => removePath(index)}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>
        <button
          className="text-white bg-blue-500 rounded-md py-2 px-4"
          onClick={choosePath}
        >
          添加目录
        </button>
      </div>
    </div>
  );
};

export default Wallpaper;
