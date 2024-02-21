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
import { ConfigWallpaper } from "@/lib/client/types/config"
import { Skeleton } from "@/components/ui/skeleton"
// import { Checkbox } from "@/components/ui/checkbox"
// import { Switch } from "@/components/ui/switch"
import { getGlobal } from "@/i18n-config";

const FormSchema = z.object({
    directories: z.array(z.object({
        path: z.string(),
    })),
    keepWallpaper: z.boolean(),
})

export default function Page() {
    const dictionary = getGlobal();
    const [mounted, setMounted] = useState(false)
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            directories: [{ path: "" }],
            keepWallpaper: false,
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
        form.setValue("keepWallpaper", config.data.keepWallpaper);
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
            keepWallpaper: data.keepWallpaper,
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

                            <FormItem>
                                <h3 className="mb-4 text-lg font-medium">壁纸参数</h3>
                                <FormField
                                    control={control}
                                    name="keepWallpaper"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-y-0 space-x-2">
                                            <FormLabel htmlFor="keepWallpaper">客户端关闭后保留壁纸</FormLabel>
                                            <FormControl>
                                                {/* <Switch id="keepWallpaper" checked={field.value}
                                                    onCheckedChange={() => {
                                                        field.onChange(!field.value);
                                                        form.handleSubmit(onSubmit)();
                                                    }} /> */}
                                            </FormControl>
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
