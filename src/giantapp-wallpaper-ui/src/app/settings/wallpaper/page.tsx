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
import { toast } from "@/components/ui/use-toast"
import shellApi from "@/lib/client/shell";
import api from "@/lib/client/api"
import { useCallback, useEffect, useState } from "react"
import { SettingWallpaper } from "@/lib/client/types/setting"
import { Skeleton } from "@/components/ui/skeleton"

const FormSchema = z.object({
    directories: z.array(z.object({
        path: z.string(),
    }))
})

export default function Page() {
    const [mounted, setMounted] = useState(false)
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            directories: [{ path: "" }],
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
        const config = await api.getConfig<SettingWallpaper>("Wallpaper")
        if (config.error || !config.data) {
            alert(config.error)
            return
        }

        form.setValue("directories", config.data.directories?.map((item) => ({ path: item })) || [{ path: "" }])
    }, [form]);

    useEffect(() => {
        if (!mounted) {
            setMounted(true);
            fetchConfig();
        }
    }, [fetchConfig, mounted]);

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        const res = data.directories.filter((item) => item.path !== "");
        //去重
        let directories = Array.from(new Set(res.map((item) => item.path)));
        const saveRes = await api.setConfig("Wallpaper", {
            directories
        })
        if (saveRes.error) {
            toast({
                duration: 3000,
                title: "保存失败",
                description: saveRes.error.message,
            });
        }
        else {
            //更新UI
            // form.setValue("directories", directories.map((item) => ({ path: item })));
        }
    }
    const openFileSelector = async (index: number) => {
        const res = await shellApi.showFolderDialog();
        if (res.error)
            return alert(res.error ? res.error.message : "未知错误");

        if (res.data)
            form.setValue(`directories.${index}.path`, res.data);

        //提交表单
        form.handleSubmit(onSubmit)();
    }

    return (
        mounted ?
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
                    <FormLabel>壁纸目录</FormLabel>
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
                                                <Input autoComplete="off" placeholder={index === 0 ? "壁纸保存目录" : "壁纸读取目录"} {...field}
                                                    onBlur={() => form.handleSubmit(onSubmit)()} />
                                            </FormControl>
                                            <Button type="button" onClick={() => openFileSelector(index)} className="items-center self-center">选择</Button>
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

                    <Button type="button" onClick={() => append({ path: "" })}>添加目录</Button>
                </form>
            </Form>
            :
            <Skeleton className="h-8 w-32" />
    )
}
