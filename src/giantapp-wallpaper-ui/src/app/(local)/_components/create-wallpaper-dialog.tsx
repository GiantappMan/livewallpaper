
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
import { Label } from "@/components/ui/label"
import { UploadCloudIcon } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface CreateWallpaperDialogProps {

}

export function CreateWallpaperDialog(props: CreateWallpaperDialogProps) {
    return <Dialog>
        <DialogTrigger asChild>
            <Button
                aria-label="创建壁纸"
                className="flex w-full h-full hover:text-primary"
                title="创建壁纸"
                variant="ghost"
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
                <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer hover:border-primary hover:bg-muted">
                    <UploadCloudIcon className="text-foreground w-10 h-10" />
                    <p className="text-gray-500">点击上传或拖入文件到这里</p>
                </div>
                <Progress value={33} />
            </div>
            <DialogFooter>
                <Button type="submit">保存</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
}