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
import { use, useCallback, useEffect, useState } from "react"
import { ConfigWallpaper, WallpaperCoveredBehavior, WallpaperCoveringProcessFilterPriority } from "@/lib/client/types/config"
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
    coveringProcessFilters: z.array(z.object({
        pid: z.number(),
        title: z.string(),
        className: z.string(),
        fileName: z.string(),
    })),
    coveringProcessFilterPriority: z.nativeEnum(WallpaperCoveringProcessFilterPriority),
    defaultVideoPlayer: z.nativeEnum(VideoPlayer),
})

export default function Page() {
    const dictionary = useAtomValue(langDictAtom);
    const [mounted, setMounted] = useState(false)
    const [processes, setProcesses] = useState<{
        pid: number,
        title: string
    }[]>([])
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            directories: [{ path: "" }],
            // keepWallpaper: false,
            coveredBehavior: WallpaperCoveredBehavior.Pause,
            coveringProcessFilters: [],
            coveringProcessFilterPriority: WallpaperCoveringProcessFilterPriority.Class,
            defaultVideoPlayer: VideoPlayer.MPV_Player
        },
    })
    const { control } = form
    const { fields: directoriesFields, append: directoriesAppend, remove: directoriesRemove } = useFieldArray({
        control,
        name: "directories",
        rules: {
            minLength: 1
        },
    })
    const { fields: coveringProcessFiltersFields, append: coveringProcessFiltersAppend, remove: coveringProcessFiltersRemove } = useFieldArray({
        control,
        name: "coveringProcessFilters"
    })
    
    useEffect(() => {
        const fetchProcesses = async () => {
            const data = await api.getProcesses();
            if (data.error) {
                toast.error(data.error)
                return
            }
            
            setProcesses(data.data || []);
        };
        fetchProcesses();
    }, []);

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
        form.setValue("coveringProcessFilters", config.data.coveringProcessFilters?.map((item) => ({ pid: item.pid, title: item.title, className: item.className, fileName: item.fileName })) || []);
        form.setValue("coveringProcessFilterPriority", config.data.coveringProcessFilterPriority);
        form.setValue("defaultVideoPlayer", config.data.defaultVideoPlayer);

    }, [form]);

    useEffect(() => {
        if (!mounted) {
            setMounted(true);
            fetchConfig();
        }
    }, [fetchConfig, mounted]);

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        const directoriesRes = data.directories.filter((item) => item.path !== "");
        let directories = Array.from(
            directoriesRes.reduce((map, item) => map.has(item.path.toLowerCase()) ? map : map.set(item.path.toLowerCase(), item.path), new Map())
        ).map(([_, path]) => path);
        const coveringProcessFiltersRes = data.coveringProcessFilters.filter((item) => item.title !== "" && item.className !== "");
        let coveringProcessFilters = Array.from(
            coveringProcessFiltersRes.reduce(
                (map, item) => {
                    const key = `${item.title.toLowerCase()}|${item.className.toLowerCase()}`;
                    return map.has(key) ? map : map.set(key, item);
                },
                new Map<string, typeof coveringProcessFiltersRes[0]>()
            )
        ).map(([_, item]) => item);
        const saveRes = await api.setConfig("Wallpaper", {
            directories,
            // keepWallpaper: data.keepWallpaper,
            coveredBehavior: data.coveredBehavior,
            coveringProcessFilters,
            coveringProcessFilterPriority: data.coveringProcessFilterPriority,
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
            directoriesAppend({ path: res.data });

        //提交表单
        form.handleSubmit(onSubmit)();
    }

    const addFilter = async () => {
        coveringProcessFiltersAppend({ pid: 0, title: "", className: "", fileName: "" });

        //提交表单
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
                        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-3">
                            <h2 className="font-semibold mt-4">{dictionary['settings'].save_directory}</h2>
                            {
                                directoriesFields.map((field, index) => (
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
                                                            directoriesRemove(index);
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
                            <FormItem className=" max-w-sm space-y-3">
                                <h2 className="font-semibold mt-4">{dictionary['settings'].other_parameters}</h2>
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
                                <FormLabel className="block">{dictionary['settings'].ignored_occluding_window}</FormLabel>
                                {
                                    coveringProcessFiltersFields.map((field, index) => (
                                        <FormField
                                            key={field.id}
                                            control={control}
                                            name={`coveringProcessFilters.${index}.pid`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex items-center space-x-2">
                                                        <Select onValueChange={async (e) => {
                                                            var pid = parseInt(e);
                                                            var process = await api.getProcess(pid);
                                                            if (process.error) {
                                                                //有可能窗口关闭时停留在选择界面，忽略异常
                                                                // toast.error(process.error);
                                                                return;
                                                            }

                                                            field.onChange(pid);
                                                            form.setValue(`coveringProcessFilters.${index}.title`, process.data?.title ?? "");
                                                            form.setValue(`coveringProcessFilters.${index}.className`, process.data?.className ?? "");
                                                            form.setValue(`coveringProcessFilters.${index}.fileName`, process.data?.fileName ?? "");
                                                            form.handleSubmit(onSubmit)();
                                                        }} value={field.value.toString()} >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={dictionary['settings'].select_window} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {processes?.map(process => (
                                                                    <SelectItem key={process?.pid} value={`${process?.pid}`}>{process?.title}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Button type="button" className="items-center self-center" onClick={() => {
                                                            coveringProcessFiltersRemove(index);
                                                            form.handleSubmit(onSubmit)()
                                                        }}>X</Button>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    ))
                                }
                                <Button type="button" onClick={addFilter}>{dictionary['settings'].add_ignored_window}</Button>
                                <FormField
                                    control={control}
                                    name="coveringProcessFilterPriority"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="coveringProcessFilterPriority">{dictionary['settings'].occluding_window_priority}</FormLabel>
                                            <Select onValueChange={(e) => {
                                                let tmp: WallpaperCoveringProcessFilterPriority = parseInt(e);
                                                field.onChange(tmp);
                                                form.handleSubmit(onSubmit)();
                                            }} value={field.value.toString()} >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="0">{dictionary['settings'].priority_title}</SelectItem>
                                                    <SelectItem value="1">{dictionary['settings'].priority_class}</SelectItem>
                                                    <SelectItem value="2">{dictionary['settings'].priority_executable}</SelectItem>
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
                                                    {/* <SelectItem value="2">{dictionary['local'].system_player}</SelectItem> */}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
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
