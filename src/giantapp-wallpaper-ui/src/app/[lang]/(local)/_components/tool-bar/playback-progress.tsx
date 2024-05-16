import api from "@/lib/client/api";
import { useState, useCallback, useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";
import { VideoSlider } from "../video-slider";
import { useAtomValue } from "jotai";
import { isPausedAtom } from "@/atoms/player";

//把秒转换成方便阅读的格式
function formatTime(seconds: number) {
    var days = Math.floor(seconds / (24 * 60 * 60));
    seconds %= 24 * 60 * 60;
    var hours = Math.floor(seconds / (60 * 60));
    seconds %= 60 * 60;
    var minutes = Math.floor(seconds / 60);
    var sec = Math.floor(seconds % 60);

    if (sec === 0 && minutes === 0 && hours === 0) {
        return `${days}d`;
    }
    if (sec === 0 && minutes === 0) {
        return `${hours}h`;
    }

    const dayStr = days > 0 ? days + 'd ' : '';
    const hourStr = hours > 0 ? (hours < 10 ? '0' + hours : hours) + ':' : '';
    const minStr = minutes < 10 ? '0' + minutes : minutes;
    const secStr = sec < 10 ? '0' + sec : sec;

    return `${dayStr}${hourStr}${minStr}:${secStr}`;
}
const PlaybackProgress = ({ screenIndex }: { screenIndex?: number }) => {
    // console.log("PlaybackProgress:", screenIndex)
    const [time, setTime] = useState('00:00');
    const [totalTime, setTotalTime] = useState('00:00');
    const [progress, setProgress] = useState(0);
    const isPaused = useAtomValue(isPausedAtom);
    //记录设置进度的时间
    const [lastSetTime, setLastSetTime] = useState<number>(0);

    const callApi = useDebouncedCallback((value) => {
        console.log("setProgress:", value);
        api.setProgress(value[0], screenIndex);
    }, 300
    );

    const handleDrag = useCallback((value: number[]) => {
        setLastSetTime(Date.now());
        setProgress(value[0]);
        callApi(value);
    }, [callApi]);

    useEffect(() => {
        const fetch = async () => {
            if ((document as any).shell_hidden)
                return;
            try {
                //如果小于设置时间x秒，直接返回
                var tmp = Date.now() - lastSetTime;
                if (tmp < 2000) {
                    return;
                }

                if (isPaused)
                    return;

                const res = await api.getWallpaperTime(screenIndex);
                // console.log("getWallpaperTime:", res);

                if (res.data) {
                    //-1 是获取失败
                    if (res.data.position != -1)
                        setTime(formatTime(res.data.position));
                    if (res.data.duration != -1)
                        setTotalTime(formatTime(res.data.duration));
                    setProgress(res.data.position / res.data.duration * 100);
                }
                else {
                    setTime('00:00');
                    setTotalTime('00:00');
                }
            } catch (error) {
                console.error('Failed to fetch time:', error);
            }
        }
        fetch();//先立即执行一次
        const timer = setInterval(fetch, 1000);
        return () => clearInterval(timer); // cleanup on component unmount
    }, [isPaused, lastSetTime, screenIndex]);

    return <div className="flex items-center justify-between text-xs w-full select-none">
        <div className="text-primary-600 dark:text-primary-400">{time}</div>
        <VideoSlider max={100} min={0} step={1} value={[progress]} className="w-full h-1 mx-4 rounded" onValueChange={handleDrag} />
        <div className="text-primary-600 dark:text-primary-400">{totalTime}</div>
    </div>
}

export default PlaybackProgress;