import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { ConfigAppearance } from "@/lib/client/types/config";

export const defaultConfig: ConfigAppearance = {
  theme: "zinc",
  mode: "system",
};

const configAtom = atomWithStorage<ConfigAppearance>("config", defaultConfig);

export function useConfig() {
  return useAtom(configAtom);
}
