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

interface SettingDialogProps {
    wallpaper?: Wallpaper | null
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
            <form onSubmit={form.handleSubmit((data) => {
                props.onChange(false);
                props.saveSuccess?.();
            })}>
                <div className="form-group">
                    <label className="form-label">启用鼠标事件</label>
                    <div className="form-switch">
                        <input
                            type="checkbox"
                            className="form-switch-input"
                            {...form.register("enableMouseEvent")}
                        />
                        <label className="form-switch-label">启用鼠标事件</label>
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">启用硬件解码</label>
                    <div className="form-switch">
                        <input
                            type="checkbox"
                            className="form-switch-input"
                            {...form.register("hardwareDecoding")}
                        />
                        <label className="form-switch-label">启用硬件解码</label>
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">启用全景模式</label>
                    <div className="form-switch">
                        <input
                            type="checkbox"
                            className="form-switch-input"
                            {...form.register("isPanScan")}
                        />
                        <label className="form-switch-label">启用全景模式</label>
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">音量</label>
                    <input
                        type="range"
                        className="form-range"
                        {...form.register("volume")}
                    />
                </div>
                <DialogFooter>
                    <Button className="btn btn-primary" type="submit">保存</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog >
}
