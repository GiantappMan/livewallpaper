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
import { useAtomValue } from "jotai";
import { langDictAtom } from "@/atoms/lang";

interface RatingDialogProps {
}

export type ConfigLaunchRecord = {
    launchTimes: number;
    lastLaunchVersion: string;
    hasShownCommentDialog: boolean;
    lastShownCommentDialogTime: number;
    rejectCount?: number;
}

export function RatingDialog(props: RatingDialogProps) {
    const dictionary = useAtomValue(langDictAtom);
    const [isClient, setIsClient] = useState(false)
    const [open, setOpen] = useState(false)

    //打开商店评价
    const openRating = async () => {
        await api.openStoreReview();
        setOpen(false);

        const config = localStorage.getItem('launchRecord');
        const launchRecord = (config ? JSON.parse(config) : {}) as ConfigLaunchRecord;
        localStorage.setItem('launchRecord', JSON.stringify({
            ...launchRecord,
            hasShownCommentDialog: true,
            lastShownCommentDialogTime: new Date().getTime()
        }));
    }

    //拒绝评价（点残忍拒绝或右上角关闭都算）：延后一个月，累计拒绝3次后不再提示
    const rejectRating = () => {
        setOpen(false);

        const config = localStorage.getItem('launchRecord');
        const launchRecord = (config ? JSON.parse(config) : {}) as ConfigLaunchRecord;
        const rejectCount = (launchRecord.rejectCount ?? 0) + 1;
        localStorage.setItem('launchRecord', JSON.stringify({
            ...launchRecord,
            rejectCount,
            launchTimes: 0,
            //延后一个月
            lastShownCommentDialogTime: new Date().getTime() + 30 * 24 * 60 * 60 * 1000,
            hasShownCommentDialog: launchRecord.hasShownCommentDialog || rejectCount >= 3,
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
                    //保留未到期的延后时间（如刚拒绝过），避免更新后立刻再次弹出
                    lastShownCommentDialogTime: Math.max(launchRecord.lastShownCommentDialogTime || 0, new Date().getTime()),
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

            //每启动N次，或者每隔N天，弹出评分对话框；延后期内（拒绝后一个月）不弹
            const maxLaunchTimes = 20;
            const maxLaunchDays = 20;
            const now = new Date().getTime();
            const isPostponed = now < (launchRecord.lastShownCommentDialogTime || 0);
            if (!isPostponed && (launchRecord.launchTimes >= maxLaunchTimes || now - launchRecord.lastShownCommentDialogTime > maxLaunchDays * 24 * 60 * 60 * 1000)) {
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

    return isClient && <Dialog open={open} onOpenChange={(next) => {
        //用户主动关闭（右上角X/Esc/点遮罩）视同拒绝
        if (!next)
            rejectRating();
    }}>
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