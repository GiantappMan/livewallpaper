"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import shellApi from "@/lib/client/shell";
import api from "@/lib/client/api"
import { useCallback, useEffect, useState } from "react"
import { ConfigWallpaper, CoveringWindow, WallpaperCoveredBehavior } from "@/lib/client/types/config"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VideoPlayer } from "@/lib/client/types/wallpaper"
import { langDictAtom } from "@/atoms/lang"
import { useAtomValue } from "jotai"

const FormSchema = z.object({
    directories: z.array(z.object({
        path: z.string(),
    })),
    // keepWallpaper: z.boolean(),
    coveredBehavior: z.nativeEnum(WallpaperCoveredBehavior),
    coveredIgnoreStrings: z.array(z.object({
        value: z.string(),
    })),
    defaultVideoPlayer: z.nativeEnum(VideoPlayer),
})

export default function Page() {
    const dictionary = useAtomValue(langDictAtom);
    const [mounted, setMounted] = useState(false)
    const [coveringWindows, setCoveringWindows] = useState<CoveringWindow[] | null>(null)
    const [newIgnoreStr, setNewIgnoreStr] = useState("")
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            directories: [{ path: "" }],
            // keepWallpaper: false,
            coveredBehavior: WallpaperCoveredBehavior.Pause,
            coveredIgnoreStrings: [],
            defaultVideoPlayer: VideoPlayer.MPV_Player
        },
    })
    const { control } = form
    const { fields, append, remove } = useFieldArray({
        control,
        name: "directories",
        rules: {
            minLength: 1
        },
    })
    const {
        fields: ignoreFields,
        append: appendIgnore,
        remove: removeIgnore,
    } = useFieldArray({
        control,
        name: "coveredIgnoreStrings",
    })

    //读取配置
    const fetchConfig = useCallback(async () => {
        const config = await api.getConfig<ConfigWallpaper>("Wallpaper")
        if (config.error || !config.data) {
            toast.error(config.error)
            return
        }

        form.setValue("directories", config.data.directories?.map((item) => ({ path: item })) || [{ path: "" }])
        // form.setValue("keepWallpaper", config.data.keepWallpaper);
        form.setValue("coveredBehavior", config.data.coveredBehavior);
        form.setValue("coveredIgnoreStrings", config.data.coveredIgnoreStrings?.map((item) => ({ value: item })) || []);
        if (config.data.defaultVideoPlayer === VideoPlayer.System_Player) {
            //系统播放器已从界面移除，旧配置迁移为 MPV
            form.setValue("defaultVideoPlayer", VideoPlayer.MPV_Player);
            form.handleSubmit(onSubmit)();
        }
        else {
            form.setValue("defaultVideoPlayer", config.data.defaultVideoPlayer);
        }

    }, [form]);

    useEffect(() => {
        if (!mounted) {
            setMounted(true);
            fetchConfig();
        }
    }, [fetchConfig, mounted]);

    //轮询当前检测到的遮挡窗口
    useEffect(() => {
        if (!mounted)
            return;
        let cancelled = false;
        const fetchCovering = async () => {
            const res = await api.getCoveringWindows();
            if (!cancelled && !res.error && res.data)
                setCoveringWindows(res.data);
        };
        fetchCovering();
        const timer = setInterval(fetchCovering, 2000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [mounted]);

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        const res = data.directories.filter((item) => item.path !== "");
        let directories = Array.from(
            new Set(res.map((item) => item.path.toLowerCase())),
            (pathLowerCase) => res.find((item) => item.path.toLowerCase() === pathLowerCase)?.path
        );
        const ignoreStrings = Array.from(
            new Set(data.coveredIgnoreStrings.map((item) => item.value.trim()).filter((item) => item !== "")),
        );
        const saveRes = await api.setConfig("Wallpaper", {
            directories,
            // keepWallpaper: data.keepWallpaper,
            coveredBehavior: data.coveredBehavior,
            coveredIgnoreStrings: ignoreStrings,
            defaultVideoPlayer: data.defaultVideoPlayer
        })
        if (saveRes.error) {
            toast.error(dictionary['settings'].failed_to_save);
            console.error(saveRes.error);
        }
        else {
            //更新UI
            // form.setValue("directories", directories.map((item) => ({ path: item })));
        }
    }
    const openFileSelector = async (index: number) => {
        const res = await shellApi.showFolderDialog();
        if (res.error)
            return alert(res.error ? res.error.message : dictionary['settings'].unknown_error);

        if (res.data)
            form.setValue(`directories.${index}.path`, res.data);

        //提交表单
        form.handleSubmit(onSubmit)();
    }

    const addFolder = async () => {
        const res = await shellApi.showFolderDialog();
        if (res.error)
            return alert(res.error ? res.error.message : dictionary['settings'].unknown_error);

        if (res.data)
            append({ path: res.data });

        //提交表单
        form.handleSubmit(onSubmit)();
    }

    const addIgnoreString = async () => {
        const value = newIgnoreStr.trim();
        if (value === "")
            return;
        const exists = form.getValues("coveredIgnoreStrings").some((item) => item.value.toLowerCase() === value.toLowerCase());
        if (!exists)
            appendIgnore({ value });
        setNewIgnoreStr("");
        //提交表单
        form.handleSubmit(onSubmit)();
    }

    //忽略指定遮挡窗口（按类名）
    const ignoreCoveringWindow = (className?: string | null) => {
        if (!className)
            return;
        const values = form.getValues("coveredIgnoreStrings").map((item) => item.value).filter((item) => item !== "");
        if (values.some((item) => item.toLowerCase() === className.toLowerCase()))
            return;
        form.setValue("coveredIgnoreStrings", [...values, className].map((item) => ({ value: item })));
        form.handleSubmit(onSubmit)();
    }

    return (
        <div className="h-screen space-y-6">
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold">{dictionary['settings'].wallpaper_settings}</h1>
            </div>
            <div className="space-y-2">
                {mounted ?
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
                            <h2 className="font-semibold mt-4">{dictionary['settings'].save_directory}</h2>
                            {
                                fields.map((field, index) => (
                                    <FormField
                                        key={field.id}
                                        control={control}
                                        name={`directories.${index}.path`}
                                        render={({ field }) => (
                                            <FormItem >
                                                <div className="flex w-full max-w-sm items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <Input autoComplete="off" placeholder={index === 0 ? dictionary['settings'].save_wallpaper_directory : dictionary['settings'].wallpaper_directory} {...field}
                                                            onBlur={() => form.handleSubmit(onSubmit)()} />
                                                    </FormControl>
                                                    <Button type="button" onClick={() => openFileSelector(index)} className="items-center self-center">{dictionary['settings'].choose}</Button>
                                                    {
                                                        index > 0 &&
                                                        <Button type="button" className="items-center self-center" onClick={() => {
                                                            remove(index);
                                                            form.handleSubmit(onSubmit)()
                                                        }}>X</Button>
                                                    }
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                ))
                            }

                            <Button type="button" onClick={addFolder}>{dictionary['settings'].add_directory}</Button>
                            <FormItem className=" max-w-sm">
                                <h2 className="mb-4 text-lg font-medium">{dictionary['settings'].other_parameters}</h2>
                                <FormField
                                    control={control}
                                    name="coveredBehavior"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="coveredBehavior">{dictionary['settings'].wallpaper_obscured}</FormLabel>
                                            <Select onValueChange={(e) => {
                                                let tmp: WallpaperCoveredBehavior = parseInt(e);
                                                field.onChange(tmp);
                                                form.handleSubmit(onSubmit)();
                                            }} value={field.value.toString()} >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="0">{dictionary['settings'].continue_playback}</SelectItem>
                                                    <SelectItem value="1">{dictionary['settings'].pause_playback}</SelectItem>
                                                    <SelectItem value="2">{dictionary['settings'].stop_playback}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="defaultVideoPlayer"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="defaultVideoPlayer">{dictionary['settings'].defaultVideoPlayer}</FormLabel>
                                            <Select onValueChange={(e) => {
                                                let tmp: VideoPlayer = parseInt(e);
                                                field.onChange(tmp);
                                                form.handleSubmit(onSubmit)();
                                            }} value={field.value.toString()} >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {/* <SelectItem value="0">{dictionary['local'].default_player}</SelectItem> */}
                                                    <SelectItem value="1">{dictionary['local'].mpv_player}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                            </FormItem>

                            <FormItem>
                                <h2 className="mb-4 text-lg font-medium">{dictionary['settings'].occlusion_detection}</h2>
                                <p className="text-sm text-muted-foreground">{dictionary['settings'].covering_window_list}</p>
                                {
                                    coveringWindows === null
                                        ? <Skeleton className="h-8 w-full max-w-sm" />
                                        : coveringWindows.length === 0
                                            ? <p className="text-sm text-muted-foreground">{dictionary['settings'].no_covering_windows}</p>
                                            : coveringWindows.map((item, index) => (
                                                <div key={index} className="flex w-full max-w-sm items-center justify-between gap-2 rounded-md border p-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate text-sm">{item.title || item.className}</div>
                                                        <div className="truncate font-mono text-xs text-muted-foreground">{item.className} · {item.screen}</div>
                                                    </div>
                                                    <Button type="button" size="sm" className="shrink-0" onClick={() => ignoreCoveringWindow(item.className)}>{dictionary['settings'].ignore}</Button>
                                                </div>
                                            ))
                                }
                                <p className="pt-2 text-sm text-muted-foreground">{dictionary['settings'].ignored_window_classes}</p>
                                {
                                    ignoreFields.map((field, index) => (
                                        <FormField
                                            key={field.id}
                                            control={control}
                                            name={`coveredIgnoreStrings.${index}.value`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex w-full max-w-sm items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <Input autoComplete="off" {...field}
                                                                onBlur={() => form.handleSubmit(onSubmit)()} />
                                                        </FormControl>
                                                        <Button type="button" className="items-center self-center" onClick={() => {
                                                            removeIgnore(index);
                                                            form.handleSubmit(onSubmit)();
                                                        }}>X</Button>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    ))
                                }
                                <div className="flex w-full max-w-sm items-center space-x-2">
                                    <Input autoComplete="off" value={newIgnoreStr}
                                        placeholder={dictionary['settings'].ignore_hint}
                                        onChange={(e) => setNewIgnoreStr(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                addIgnoreString();
                                            }
                                        }} />
                                    <Button type="button" className="items-center self-center" onClick={addIgnoreString}>{dictionary['settings'].add_ignore}</Button>
                                </div>
                            </FormItem>
                        </form>
                    </Form>
                    :
                    <Skeleton className="h-8 w-32" />
                }
            </div>
        </div>
    )
}
