import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import { SpeakerLoudIcon, SpeakerOffIcon, SpeakerQuietIcon } from "@radix-ui/react-icons"
import api from "@/lib/client/api";
import { useAtom, useAtomValue } from "jotai";
import { langDictAtom } from "@/atoms/lang";
import { audioScreenIndexAtom, volumeAtom } from "@/atoms/player";

//音量按钮，修改音量
export default function AudioVolumeBtn() {
    const dictionary = useAtomValue(langDictAtom);
    const [volume, setVolume] = useAtom(volumeAtom);
    const screenIndex = useAtomValue(audioScreenIndexAtom);

    const handleVolumeChange = useCallback(async (value: number[]) => {
        setVolume(value[0])
        api.setVolume(value[0], screenIndex);
    }, [screenIndex, setVolume]);

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