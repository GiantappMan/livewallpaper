import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { Appearance } from "@/lib/client/types/configs/appearance";

export const defaultConfig: Appearance = {
  theme: "zinc",
  mode: "system",
};

const configAtom = atomWithStorage<Appearance>("config", defaultConfig);

export function useConfig() {
  return useAtom(configAtom);
}
