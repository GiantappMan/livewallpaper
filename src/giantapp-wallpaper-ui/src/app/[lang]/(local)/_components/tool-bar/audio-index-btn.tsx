import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCallback, useState } from "react";
import { CheckIcon, SpeakerOffIcon, SpeakerLoudIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils";
import api from "@/lib/client/api";
import PlayingStatus from "@/lib/client/types/playing-status";
import { getGlobal } from '@/i18n-config';

//音量按钮，修改音源
export default function AudioIndexBtn(props: { playingStatus: PlayingStatus, playingStatusChange: (e: PlayingStatus) => void }) {
    const dictionary = getGlobal();
    const [open, setOpen] = useState(false)
    const [selectedScreenIndex, setSelectedScreenIndex] = useState(props.playingStatus.audioScreenIndex)

    const handleScreenIndexChange = useCallback(async (value: string) => {
        var index = Number(value)
        setSelectedScreenIndex(index)
        api.setVolume(index < 0 ? 0 : 100, index);
        setOpen(false)
        props.playingStatusChange({
            ...props.playingStatus,
            audioScreenIndex: index,
            volume: index < 0 ? 0 : 100
        });
    }, [props]);

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" className="hover:text-primary px-3" title={dictionary['local'].audio_source}>
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
                                        {dictionary['local'].screen.replace("{0}", screen.deviceName)}
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
                                {dictionary['local'].mute}
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