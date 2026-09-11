import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { ConfigAppearance } from "@/lib/client/types";
import api from "@/lib/client/api";
import { useEffect } from "react";

export const defaultConfig: ConfigAppearance = {
  theme: "zinc",
  mode: "system",
  skin: "default",
};

const configAtom = atomWithStorage<ConfigAppearance>("config", defaultConfig);

/**
 * 外观配置：localStorage 提供即时渲染，后端配置为最终来源（启动时同步一次）。
 */
export function useConfig() {
  const [config, setConfigAtom] = useAtom(configAtom);

  // 首次挂载时从后端同步（后端为准）
  useEffect(() => {
    let cancelled = false;
    api.getConfig<ConfigAppearance>("Appearance").then((res) => {
      if (!cancelled && res.data) {
        setConfigAtom(res.data);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setConfig = (value: ConfigAppearance) => {
    setConfigAtom(value);
    api.setConfig("Appearance", value);
  };

  return [config, setConfig] as const;
}
