"use client"
import api from "@/lib/client/api";
import { useEffect } from "react"

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
            const maxLaunchTimes = 20;
            const maxLaunchDays = 20;
            const now = new Date().getTime();
            if (launchRecord.launchTimes > maxLaunchTimes || now - launchRecord.lastShownCommentDialogTime > maxLaunchDays * 24 * 60 * 60 * 1000) {
                console.log("show rating dialog")
                setLaunchRecord({
                    ...launchRecord,
                    hasShownCommentDialog: true,
                    lastShownCommentDialogTime: new Date().getTime()
                })
            }
            else {
                console.log("--------test", launchRecord)
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
    }, [])
    console.log("ratingDialog test")
    return <></>
}