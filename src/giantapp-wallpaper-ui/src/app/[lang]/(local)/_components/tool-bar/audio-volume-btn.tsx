import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useCallback, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { SpeakerLoudIcon, SpeakerOffIcon, SpeakerQuietIcon } from "@radix-ui/react-icons"
import api from "@/lib/client/api";
import PlayingStatus from "@/lib/client/types/playing-status";
import { getGlobal } from '@/i18n-config';

//音量按钮，修改音量
export default function AudioVolumeBtn(props: { playingStatus: PlayingStatus, screenIndex: number, playingStatusChange: (e: PlayingStatus) => void }) {
    const dictionary = getGlobal();
    const [volume, setVolume] = useState(props.playingStatus.volume)

    //监控screenIndex变化
    useEffect(() => {
        setVolume(props.screenIndex === props.playingStatus.audioScreenIndex ? props.playingStatus.volume : 0)
    }, [props.playingStatus.audioScreenIndex, props.playingStatus.volume, props.screenIndex]);

    const handleVolumeChange = useCallback(async (value: number[]) => {
        setVolume(value[0])
        api.setVolume(value[0], props.screenIndex);
        props.playingStatusChange({
            ...props.playingStatus,
            volume: value[0],
            audioScreenIndex: props.screenIndex
        })
    }, [props]);

    const handleVolumeChangeDebounced = useDebouncedCallback((value) => {
        handleVolumeChange(value);
    }, 300);

    return (
        <>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" className="hover:text-primary px-3" title={dictionary['local'].volume}>
                        {
                            volume == 0 ?
                                <SpeakerOffIcon /> : (
                                    volume > 50 ? <SpeakerLoudIcon /> : <SpeakerQuietIcon />
                                )
                        }
                    </Button>
                </PopoverTrigger>
                <PopoverContent>
                    <Slider defaultValue={[volume]} max={100} min={0} step={1} onValueChange={handleVolumeChangeDebounced} />
                </PopoverContent>
            </Popover>
        </>
    );
}