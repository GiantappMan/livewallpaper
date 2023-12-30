
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
import { DeleteIcon, UploadCloudIcon } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import api from "@/lib/client/api"
import { toast } from "sonner"

interface CreateWallpaperDialogProps {
    open: boolean
    onChange: (open: boolean) => void
}

function processFile(file: File, onProgress: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            if (!e.target) {
                reject(new Error('事件中找不到目标'));
                return;
            }
            try {
                const contents = new Uint8Array(e.target.result as ArrayBuffer);
                if (contents) {
                    let binaryString = '';
                    const chunkSize = 50000; // 防止堆栈溢出的块大小
                    let i = 0; // 在函数外部初始化以跟踪进度
                    let lastReportedProgress = 0; // 上次报告的进度

                    const processChunk = () => {
                        const start = i;
                        const end = Math.min(i + chunkSize, contents.length);
                        const subArray = Array.from(contents.subarray(start, end));
                        binaryString += String.fromCharCode.apply(null, subArray);
                        i += chunkSize;

                        // 计算并报告进度
                        const progress = i / contents.length * 100;
                        //变化大于一才触发
                        if (Math.floor(progress) > Math.floor(lastReportedProgress)) {
                            onProgress(progress);
                            lastReportedProgress = progress;
                        }

                        if (i < contents.length) {
                            // 如果还有更多要处理的，安排下一个块
                            setTimeout(processChunk, 0);
                        } else {
                            // 否则，完成处理
                            let base64String = btoa(binaryString);
                            resolve(base64String);
                        }
                    }

                    // 开始处理
                    processChunk();
                }
            } catch (error) {
                reject(error);
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

export function CreateWallpaperDialog(props: CreateWallpaperDialogProps) {
    const [isOver, setIsOver] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<string>();
    const [title, setTitle] = useState<string>();

    //每次打开重置状态
    useEffect(() => {
        setIsOver(false);
        setProgress(0);
        setUploading(false);
        setUploadedFile(undefined);
    }, [props.open]);

    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(false);
        setUploading(true);

        var file = e.dataTransfer?.files[0];
        const progressCallback = (progress: number) => {
            console.log(`上传进度: ${progress}%`);
            progress = Math.floor(progress);
            setProgress(progress);
        };
        try {
            const base64String = await processFile(file, progressCallback);
            console.log("上传", new Date());
            await api.uploadToTmp(file.name, base64String);
            console.log("已上传", new Date());
            setUploadedFile(file.name);
        } catch (e) {
            toast.error((e as any).message);
        } finally {
            setUploading(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(false);
    }, []);

    const handleSave = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        toast.success("保存成功")
        console.log("save")
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
            <form onSubmit={handleSave}>
                <DialogHeader>
                    <DialogTitle>创建壁纸</DialogTitle>
                    <DialogDescription>
                        本地壁纸，仅保存在你本机
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-2 mb-3">
                    <div className="flex flex-col space-y-4">
                        <Input id="title" placeholder="输入标题" autoComplete="off" />
                        {!uploadedFile
                            ?
                            <>
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
                                {uploading && <Progress value={progress} />}
                            </>
                            :
                            <>
                                <h4 className="text-[#9CA3AF] mb-2">已上传文件:</h4>
                                <div className="flex justify-between items-center text-[#9CA3AF]">
                                    <p>{uploadedFile}</p>
                                    <Button variant="ghost" onClick={() => setUploadedFile(undefined)}>
                                        <DeleteIcon className="h-6 w-6" />
                                    </Button>
                                </div>
                            </>
                        }
                    </div>
                </div>
                <DialogFooter >
                    <Button type="submit">保存</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog >
}