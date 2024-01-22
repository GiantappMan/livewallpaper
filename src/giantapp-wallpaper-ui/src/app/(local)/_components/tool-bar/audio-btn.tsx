import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useCallback, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Screen } from "@/lib/client/types/screen";
import { CheckIcon, SpeakerOffIcon, SpeakerLoudIcon, SpeakerQuietIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils";
import api from "@/lib/client/api";
import PlayingStatus from "@/lib/client/types/playing-status";

export default function AudioBtn(props: { audioScreenIndex: number, playingStatus: PlayingStatus }) {
    const [open, setOpen] = useState(false)
    const [selectedScreenIndex, setSelectedScreenIndex] = useState(props.playingStatus.audioScreenIndex)

    const handleScreenIndexChange = useCallback(async (value: string) => {
        var index = Number(value)
        setSelectedScreenIndex(index)
        api.setVolume(index < 0 ? 0 : 100, index);
        setOpen(false)
    }, []);

    // const handleVolumeChange = useCallback(async (value: number[]) => {
    //     api.setVolume(value[0], Number(selectedScreenIndex));
    // }, [selectedScreenIndex]);

    // const handleVolumeChangeDebounced = useDebouncedCallback((value) => {
    //     handleVolumeChange(value);
    // }, 300);

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" className="hover:text-primary px-3" title="音源设置">
                        {
                            selectedScreenIndex === -1 ?
                                <SpeakerOffIcon /> :
                                <SpeakerLoudIcon />
                        }
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command>
                        <CommandGroup>
                            {
                                props.playingStatus.screens.map((screen, index) => {
                                    const currentValue = index.toString()
                                    return <CommandItem
                                        key={index}
                                        value={currentValue}
                                        onSelect={handleScreenIndexChange}>
                                        屏幕{screen.deviceName}
                                        <CheckIcon
                                            className={cn(
                                                "ml-auto h-4 w-4",
                                                selectedScreenIndex === Number(currentValue) ? "opacity-100" : "opacity-0"
                                            )} />
                                    </CommandItem>
                                })
                            }
                            <CommandItem value={"-1"}
                                onSelect={handleScreenIndexChange}>
                                静音
                                <CheckIcon
                                    className={cn(
                                        "ml-auto h-4 w-4",
                                        selectedScreenIndex === -1 ? "opacity-100" : "opacity-0"
                                    )} />
                            </CommandItem>
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
        </>
    );
}