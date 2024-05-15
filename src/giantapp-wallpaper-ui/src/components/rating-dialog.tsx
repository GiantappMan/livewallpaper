"use client"

import api from "@/lib/client/api";
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { getGlobal } from "@/i18n-config";

interface RatingDialogProps {
}

export type ConfigLaunchRecord = {
    launchTimes: number;
    lastLaunchVersion: string;
    hasShownCommentDialog: boolean;
    lastShownCommentDialogTime: number;
}

export function RatingDialog(props: RatingDialogProps) {
    const dictionary = getGlobal();
    const [isClient, setIsClient] = useState(false)
    const [open, setOpen] = useState(false)

    //打开商店评价
    const openRating = async () => {
        await api.openStoreReview(process.env.NEXT_PUBLIC_MS_Address!);
        setOpen(false);

        const config = localStorage.getItem('launchRecord');
        const launchRecord = (config ? JSON.parse(config) : {}) as ConfigLaunchRecord;
        localStorage.setItem('launchRecord', JSON.stringify({
            ...launchRecord,
            hasShownCommentDialog: true,
            lastShownCommentDialogTime: new Date().getTime()
        }));
    }

    //拒绝评价
    const rejectRating = () => {
        setOpen(false);

        //延长下次显示时间和次数
        const config = localStorage.getItem('launchRecord');
        const launchRecord = (config ? JSON.parse(config) : {}) as ConfigLaunchRecord;
        localStorage.setItem('launchRecord', JSON.stringify({
            ...launchRecord,
            launchTimes: -20,
            //当前时间加20天
            lastShownCommentDialogTime: new Date().getTime() + 20 * 24 * 60 * 60 * 1000,
        }));
    }

    useEffect(() => {
        const config = localStorage.getItem('launchRecord');
        const launchRecord = (config ? JSON.parse(config) : {}) as ConfigLaunchRecord;
        const setLaunchRecord = (data: ConfigLaunchRecord) => {
            localStorage.setItem('launchRecord', JSON.stringify(data));
        }

        const setLaunchInfo = (async () => {
            const { data: version } = await api.getVersion();
            if (!version)
                return;

            //版本不一致，重置数据
            if (launchRecord.lastLaunchVersion !== version) {
                setLaunchRecord({
                    ...launchRecord,
                    launchTimes: 0,
                    lastShownCommentDialogTime: new Date().getTime(),
                    lastLaunchVersion: version,
                    // hasShownCommentDialog: false
                })
                return;
            }

            if (launchRecord.hasShownCommentDialog) {
                setLaunchRecord({
                    ...launchRecord,
                    launchTimes: launchRecord.launchTimes + 1,
                })
                return;
            }

            //每启动N次，或者每隔N天，弹出评分对话框
            const maxLaunchTimes = 20;
            const maxLaunchDays = 20;
            const now = new Date().getTime();
            if (launchRecord.launchTimes >= maxLaunchTimes || now - launchRecord.lastShownCommentDialogTime > maxLaunchDays * 24 * 60 * 60 * 1000) {
                //默认拒绝评价
                setLaunchRecord({
                    ...launchRecord,
                    launchTimes: 1,
                    lastShownCommentDialogTime: now,
                })
                setOpen(true);
            }
            else {
                //增加一次计数
                setLaunchRecord({
                    ...launchRecord,
                    launchTimes: launchRecord.launchTimes + 1,
                })
            }
        });

        setLaunchInfo();
        setIsClient(true)
    }, [])

    return isClient && <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>{dictionary['common'].encouragementMessage} </DialogTitle>
                <DialogDescription>
                    {dictionary['common'].importanceOfFeedback}
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                {dictionary['common'].feedbackPrompt}
            </div>
            <DialogFooter>
                <Button type="submit" onClick={openRating}>{dictionary['common'].positiveReview}</Button>
                <Button variant="secondary" onClick={rejectRating}>{dictionary['common'].negativeReview}</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
}