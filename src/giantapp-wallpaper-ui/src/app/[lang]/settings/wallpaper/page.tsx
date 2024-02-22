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
import { ConfigWallpaper, WallpaperCoveredBehavior } from "@/lib/client/types/config"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getGlobal } from "@/i18n-config";

const FormSchema = z.object({
    directories: z.array(z.object({
        path: z.string(),
    })),
    // keepWallpaper: z.boolean(),
    coveredBehavior: z.nativeEnum(WallpaperCoveredBehavior)
})

export default function Page() {
    const dictionary = getGlobal();
    const [mounted, setMounted] = useState(false)
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            directories: [{ path: "" }],
            // keepWallpaper: false,
            coveredBehavior: WallpaperCoveredBehavior.Pause,
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
    }, [form]);

    useEffect(() => {
        if (!mounted) {
            setMounted(true);
            fetchConfig();
        }
    }, [fetchConfig, mounted]);

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        const res = data.directories.filter((item) => item.path !== "");
        let directories = Array.from(
            new Set(res.map((item) => item.path.toLowerCase())),
            (pathLowerCase) => res.find((item) => item.path.toLowerCase() === pathLowerCase)?.path
        );
        const saveRes = await api.setConfig("Wallpaper", {
            directories,
            // keepWallpaper: data.keepWallpaper,
            coveredBehavior: data.coveredBehavior
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
                                <h2 className="mb-4 text-lg font-medium">其他参数</h2>
                                <FormField
                                    control={control}
                                    name="coveredBehavior"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="coveredBehavior">壁纸被遮挡时</FormLabel>
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
                                                    <SelectItem value="0">继续播放</SelectItem>
                                                    <SelectItem value="1">暂停播放</SelectItem>
                                                    <SelectItem value="2">停止播放</SelectItem>
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
