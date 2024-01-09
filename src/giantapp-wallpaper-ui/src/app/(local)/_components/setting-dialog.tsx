import { Wallpaper } from "@/lib/client/types/wallpaper"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import * as z from "zod"
import { useForm, useFormState } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { useEffect, useState } from "react"
import api from "@/lib/client/api"
import { toast } from "sonner"

interface SettingDialogProps {
    wallpaper: Wallpaper
    open: boolean
    onChange: (open: boolean) => void
    saveSuccess?: () => void
}

const formSchema = z.object({
    enableMouseEvent: z.boolean(),
    hardwareDecoding: z.boolean(),
    isPanScan: z.boolean(),
    volume: z.number().min(0).max(100),
})

export function SettingDialog(props: SettingDialogProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        mode: "onChange",
        defaultValues: {
            enableMouseEvent: props.wallpaper?.setting.enableMouseEvent ?? true,
            hardwareDecoding: props.wallpaper?.setting.hardwareDecoding ?? true,
            isPanScan: props.wallpaper?.setting.isPanScan ?? true,
            volume: props.wallpaper?.setting.volume ?? 100,
        },
    })
    const { isDirty } = useFormState({ control: form.control });
    const [saving, setSaving] = useState(false);

    //每次打开重置状态
    useEffect(() => {
        if (props.open)
            form.reset({
                enableMouseEvent: props.wallpaper.setting.enableMouseEvent,
                hardwareDecoding: props.wallpaper.setting.hardwareDecoding,
                isPanScan: props.wallpaper.setting.isPanScan,
                volume: props.wallpaper.setting.volume,
            })
    }, [form, props.open, props.wallpaper])

    async function onSubmit(data: z.infer<typeof formSchema>) {
        if (saving) return;
        setSaving(true);

        const setting = {
            enableMouseEvent: data.enableMouseEvent,
            hardwareDecoding: data.hardwareDecoding,
            isPanScan: data.isPanScan,
            volume: data.volume,
        }

        const res = await api.setWallpaperSetting(setting, props.wallpaper);
        if (res.data) {
            toast.success("设置成功");
        }
        else {
            toast.error("设置失败");
        }

        props.onChange(false);
        props.saveSuccess?.();

        setSaving(false);
    }

    const fileType = Wallpaper.getFileType(props.wallpaper.fileName);
    if (!fileType)
        return null;

    return <Dialog open={props.open} onOpenChange={(e) => {
        if (!e && isDirty) {
            confirm("尚未保存，确定要关闭吗？") && props.onChange(e);
            return;
        }
        props.onChange(e);
    }} >
        <DialogContent>
            <DialogHeader>
                <DialogTitle>设置</DialogTitle>
                <DialogDescription>设置壁纸的相关参数</DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form className="space-y-6"
                    onSubmit={form.handleSubmit(onSubmit)}>
                    {fileType === "app" && <>
                        <FormField
                            control={form.control}
                            name="enableMouseEvent"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>鼠标事件</FormLabel>
                                        <FormDescription>
                                            开启鼠标事件，关闭则鼠标穿透
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </>}
                    {fileType === "video" && <>
                        <FormField
                            control={form.control}
                            name="hardwareDecoding"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>硬解码</FormLabel>
                                        <FormDescription>
                                            开启消耗GPU，关闭消耗CPU
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="isPanScan"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>全景模式</FormLabel>
                                        <FormDescription>
                                            开启全景模式，关闭则为平铺模式
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="volume"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>音量</FormLabel>
                                        <FormDescription>
                                            设置音量大小
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <div className="flex items-center flex-row">
                                            <span className="mr-2">
                                                {field.value}
                                            </span>
                                            <input
                                                type="range"
                                                min={0}
                                                max={100}
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        </div>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </>}
                    <DialogFooter>
                        <Button className="btn btn-primary" type="submit" disabled={saving}>
                            {saving && <div className="animate-spin w-4 h-4 border-t-2 border-muted rounded-full mr-2" />}
                            {saving ? "保存中..." : "保存"}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog >
}
