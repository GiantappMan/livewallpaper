
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { UploadCloudIcon } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useCallback, useState } from "react"
import { cn } from "@/lib/utils"
import api from "@/lib/client/api"

interface CreateWallpaperDialogProps {
    open: boolean
    onChange: (open: boolean) => void
}

export function CreateWallpaperDialog(props: CreateWallpaperDialogProps) {
    const [isOver, setIsOver] = useState(false);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(false);

        var file = e.dataTransfer?.files[0];

        const reader = new FileReader();
        reader.onload = async (e) => {
            if (!e.target)
                return;
            const contents = new Uint8Array(e.target.result as ArrayBuffer);
            if (contents) {
                let binaryString = '';
                const chunkSize = 5000; // Size of chunks to prevent stack overflow

                //打印进度
                const totalProgress = contents.length / chunkSize
                let currentProgress = 0
                for (let i = 0; i < contents.length; i += chunkSize) {
                    const subArray = Array.from(contents.subarray(i, i + chunkSize));
                    binaryString += String.fromCharCode.apply(null, subArray);
                    //打印进度
                    currentProgress += 1
                    console.log(currentProgress / totalProgress)
                }
                let base64String = btoa(binaryString);
                console.log("upload", new Date())
                await api.createWallpaper(file.name, base64String)
                console.log("uploaded", new Date())
            }
        };
        reader.readAsArrayBuffer(file);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(false);
    }, []);

    return <Dialog open={props.open} onOpenChange={(e) => props.onChange(e)} >
        <DialogTrigger asChild>
            <Button
                aria-label="创建壁纸"
                className="flex w-full h-full hover:text-primary"
                title="创建壁纸"
                variant="ghost"
                onClick={() => props.onChange(!props.open)}
            >
                <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M12 4v16m8-8H4" />
                </svg>
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>创建壁纸</DialogTitle>
                <DialogDescription>
                    本地壁纸，仅保存在你本机
                </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col space-y-4">
                <Input id="title" placeholder="输入标题" />
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(["flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer hover:border-primary hover:bg-muted", {
                        "border-primary bg-muted": isOver,
                    }])}>
                    <UploadCloudIcon className="text-foreground w-10 h-10" />
                    <p className="text-gray-500">{isOver ? "释放鼠标" : " 点击上传或拖入文件到这里"}</p>
                </div>
                <Progress value={33} />
            </div>
            <DialogFooter>
                <Button type="submit">保存</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
}