import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCallback, useState } from "react";
import { CheckIcon, SpeakerOffIcon, SpeakerLoudIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils";
import api from "@/lib/client/api";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { langDictAtom } from "@/atoms/lang";
import { audioScreenIndexAtom, screensAtom, volumeAtom } from "@/atoms/player";

//音量按钮，修改音源
export default function AudioIndexBtn() {
    const dictionary = useAtomValue(langDictAtom);
    const [open, setOpen] = useState(false)
    const [audioScreenIndex, setAudioScreenIndex] = useAtom(audioScreenIndexAtom);
    const setVolume = useSetAtom(volumeAtom);
    const screens = useAtomValue(screensAtom);

    const handleScreenIndexChange = useCallback(async (value: string) => {
        var index = Number(value)
        setAudioScreenIndex(index)
        api.setVolume(index < 0 ? 0 : 100, index);
        setOpen(false)
        setVolume(index < 0 ? 0 : 100)
    }, [setAudioScreenIndex, setVolume]);

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" className="hover:text-primary px-3" title={dictionary['local'].audio_source}>
                        {
                            audioScreenIndex === -1 ?
                                <SpeakerOffIcon /> :
                                <SpeakerLoudIcon />
                        }
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command>
                        <CommandGroup>
                            {
                                screens.map((screen, index) => {
                                    const currentValue = index.toString()
                                    return <CommandItem
                                        key={index}
                                        value={currentValue}
                                        onSelect={handleScreenIndexChange}>
                                        {dictionary['local'].screen.replace("{0}", screen.deviceName)}
                                        <CheckIcon
                                            className={cn(
                                                "ml-auto h-4 w-4",
                                                audioScreenIndex === Number(currentValue) ? "opacity-100" : "opacity-0"
                                            )} />
                                    </CommandItem>
                                })
                            }
                            <CommandItem value={"-1"}
                                onSelect={handleScreenIndexChange}>
                                {dictionary['local'].mute}
                                <CheckIcon
                                    className={cn(
                                        "ml-auto h-4 w-4",
                                        audioScreenIndex === -1 ? "opacity-100" : "opacity-0"
                                    )} />
                            </CommandItem>
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
        </>
    );
}