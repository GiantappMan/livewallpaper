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
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface RatingDialogProps {
}

export type ConfigLaunchRecord = {
    lastLaunchTime: number;
    launchTimes: number;
    lastLaunchVersion: string;
    hasShownCommentDialog: boolean;
    lastShownCommentDialogTime: number;
}

export function RatingDialog(props: RatingDialogProps) {
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
                    launchTimes: 1,
                    lastLaunchTime: new Date().getTime(),
                    lastLaunchVersion: version,
                    hasShownCommentDialog: false
                })
                return;
            }

            if (launchRecord.hasShownCommentDialog) {
                setLaunchRecord({
                    ...launchRecord,
                    launchTimes: launchRecord.launchTimes + 1,
                    lastLaunchTime: new Date().getTime(),
                })
                return;
            }

            //每启动N次，或者每隔N天，弹出评分对话框
            const maxLaunchTimes = 5;
            const maxLaunchDays = 20;
            const now = new Date().getTime();
            if (launchRecord.launchTimes > maxLaunchTimes || now - launchRecord.lastShownCommentDialogTime > maxLaunchDays * 24 * 60 * 60 * 1000) {
                setOpen(true);
            }
            else {
                setLaunchRecord({
                    ...launchRecord,
                    launchTimes: launchRecord.launchTimes + 1,
                    lastLaunchTime: new Date().getTime(),
                    lastLaunchVersion: version
                })
            }

            // if (launchRecord.launchTimes > 5 && !launchRecord.hasShownCommentDialog) {
            //     console.log("show rating dialog")
            //     setLaunchRecord({
            //         ...launchRecord,
            //         hasShownCommentDialog: true,
            //         lastShownCommentDialogTime: new Date().getTime()
            //     })
            // }
            // else {
            //     console.log("--------test", launchRecord)
            //     setLaunchRecord({
            //         ...launchRecord,
            //         launchTimes: launchRecord.launchTimes + 1,
            //         lastLaunchTime: new Date().getTime(),
            //         lastLaunchVersion: version
            //     })
            // }
        });

        setLaunchInfo();
        setIsClient(true)
    }, [])

    console.log("ratingDialog test")
    return isClient && <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>开发不易，需要鼓励</DialogTitle>
                <DialogDescription>
                    您的好评是对我们至关重要
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                您似乎已经使用该版本一段时间了，有什么问题或反馈想告诉开发者吗？
            </div>
            <DialogFooter>
                <Button type="submit" onClick={openRating}>尚个好评</Button>
                <Button variant="secondary" onClick={() => setOpen(false)}>残忍拒绝</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
}