"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import api from "@/lib/client/api";
import type { UpdateState } from "@/lib/client/types/config";
import { useAtomValue } from "jotai";
import { langDictAtom } from "@/atoms/lang";

//每 1.5 秒轮询宿主更新状态；下载完成后弹窗提示用户点击安装
export function useUpdateState() {
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);

  useEffect(() => {
    if (!api.isRunningInClient()) return;
    const tick = () => api.getUpdateState().then(setUpdateState);
    tick();
    const timer = setInterval(tick, 1500);
    return () => clearInterval(timer);
  }, []);

  return updateState;
}

export function UpdatePrompt() {
  const dictionary = useAtomValue(langDictAtom);
  const state = useUpdateState();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const show = !!state && state.state === "downloaded" && dismissed !== state.version;

  return (
    <Dialog open={show} onOpenChange={(open) => !open && setDismissed(state?.version ?? null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {dictionary['settings'].update_downloaded.replace("{0}", state?.version ?? "")}
          </DialogTitle>
          <DialogDescription className="whitespace-pre-line">
            {state?.notes}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDismissed(state?.version ?? null)}>
            {dictionary['settings'].update_later}
          </Button>
          <Button onClick={() => api.installUpdate()}>
            {dictionary['settings'].install_now}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
