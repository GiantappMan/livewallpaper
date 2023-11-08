import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { SettingAppearance } from "@/lib/client/types/setting-appearance";

export const defaultConfig: SettingAppearance = {
  theme: "zinc",
  mode: "system",
};

const configAtom = atomWithStorage<SettingAppearance>("config", defaultConfig);

export function useConfig() {
  return useAtom(configAtom);
}
