"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import * as api from "@/lib/client/api";

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { useEffect, useState } from "react"

const FormSchema = z.object({
    paths: z.array(z.object({
        path: z.string().min(1, {
            message: "输入路径",
        }),
    })).min(1, {
        message: "至少输入一个路径",
    })
})

export default function Page() {
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            paths: [{ path: "" }],
        },
    })

    const { control, trigger } = form
    const { fields, append, remove } = useFieldArray({
        control,
        name: "paths",
        rules: {
            minLength: 1
        },
    })

    function onSubmit(data: z.infer<typeof FormSchema>) {
        toast({
            title: "You submitted the following values:",
            description: (
                <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
                    <code className="text-white">{JSON.stringify(data, null, 2)}</code>
                </pre>
            ),
        })
    }
    function handleInputChange(index: number, text: string) {
        //提交表单
        // trigger().then((isValid) => {
        //     if (isValid) {
        //         //表单验证通过
        //         append({ path: "" })
        //     } else {
        //         //表单验证失败
        //         remove(index)
        //     }
        // })
    }
    function handleMessage(event) {
        debugger
        window.removeEventListener('message', handleMessage);
        const message = event.data;
    }

    function sendMessageToWPFAndWait(message) {
        window.addEventListener('message', handleMessage);
        window.chrome.webview.postMessage(message);
    }
    const openFileSelector = async () => {
        // let res = sendMessageToWPFAndWait('open-file-dialog');
        const res = await api.showFolderDialog();
        alert(res.data);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-6">
                <FormLabel>壁纸目录</FormLabel>
                {fields.map((field, index) => (
                    <FormField
                        key={field.id}
                        control={control}
                        name={`paths.${index}.path`}
                        render={({ field }) => (
                            <FormItem >
                                <div className="flex w-full max-w-sm items-center space-x-2 space-y-0">
                                    <FormControl>
                                        <Input autoComplete="off" placeholder={index === 0 ? "壁纸保存目录" : "壁纸读取目录"} {...field}
                                            onBlur={(e) => handleInputChange(index, e.target.value)} />
                                    </FormControl>
                                    <Button onClick={openFileSelector} type="button" className="items-center self-center">选择</Button>
                                    {
                                        fields.length > 1 &&
                                        <Button className="items-center self-center" onClick={() => remove(index)}>X</Button>
                                    }
                                </div>
                            </FormItem>
                        )}
                    />
                ))}

                <Button onClick={() => append({ path: "" })}>添加目录</Button>
            </form>
        </Form>
    )
}
