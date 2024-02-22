
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { DeleteIcon, UploadCloudIcon, ListPlus } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import api from "@/lib/client/api"
import { toast } from "sonner"
import * as z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Wallpaper, WallpaperMeta, WallpaperType } from "@/lib/client/types/wallpaper"
import processFile from "./process-file"
import { Switch } from "@/components/ui/switch"
import { SelectWallpaperDialog } from "../select-wallpaper-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getGlobal } from '@/i18n-config';


function getBase64FromBlob(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (!e.target) {
                reject(new Error('事件中找不到目标'));
                return;
            }
            const arrayBuffer = e.target.result;
            const binaryString = Array.from(new Uint8Array(arrayBuffer as ArrayBuffer)).map(byte => String.fromCharCode(byte)).join('');
            const base64 = btoa(binaryString);
            resolve(base64);
        };
        reader.readAsArrayBuffer(blob);
    });
}

function generateCoverImage(previewElement: HTMLVideoElement | HTMLImageElement | undefined | null, eWidth: number, eHeight: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        if (!previewElement) {
            reject(new Error('预览元素未找到'));
            return;
        }
        // 创建一个canvas元素
        const canvas = document.createElement('canvas');

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error('Could not create canvas context'));
            return;
        }

        //按previewElement元素比例缩放到500
        const drawWidth = 500;
        const drawHeight = drawWidth * (eHeight / eWidth);
        canvas.width = drawWidth;
        canvas.height = drawHeight;
        ctx.drawImage(previewElement, 0, 0, drawWidth, drawHeight);
        // 将canvas的内容转换为Blob对象
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Could not create blob from canvas'));
            }
        }, 'image/jpeg');
    });
}

function generatePlaylistCover(imageUrls: string[]): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return reject(new Error('Could not get canvas context'));
        }

        // 定义单张图片的宽度和canvas的总宽度
        const singleWidth = 500;
        const canvasWidth = singleWidth * 3;  // 3x3网格
        canvas.width = canvasWidth;

        // 限制最多9张图片
        const processedImageUrls = imageUrls.slice(0, 9);
        // 加载所有图片
        const images = processedImageUrls.map(url => {
            const img = new Image();
            img.src = url;
            img.crossOrigin = 'Anonymous';
            return img;
        });

        // 确保所有图片加载完成
        const loadPromises = images.map(img => new Promise<HTMLImageElement>((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image at ${img.src}`));
        }));

        Promise.all(loadPromises).then(loadedImages => {
            // 计算每张图片的缩放后高度，选择最大高度作为行高
            const heights = loadedImages.map(img => singleWidth * (img.height / img.width));
            const rowHeight = Math.max(...heights);
            // 设置canvas的总高度
            canvas.height = rowHeight * 3; // 3行

            loadedImages.forEach((img, index) => {
                const x = (index % 3) * singleWidth; // 每3张图片换行
                const y = Math.floor(index / 3) * rowHeight; // 计算当前行
                const height = singleWidth * (img.height / img.width); // 缩放后的高度
                ctx.drawImage(img, x, y, singleWidth, height);
            });

            // 导出结果并解析 Promise
            canvas.toBlob(blob => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Could not create blob from canvas'));
                }
            }, 'image/png');
        }).catch(reject);
    });
};

let abortController: AbortController | undefined = undefined;

interface WallpaperDialogProps {
    wallpaper?: Wallpaper | null
    open: boolean
    onChange: (open: boolean) => void
    createSuccess?: () => void
}

let defaultValues: {
    title: string,
    isPlaylist: boolean,
    file: File | undefined,
    wallpapers: Wallpaper[]
} = {
    title: "",
    isPlaylist: false,
    file: undefined,
    wallpapers: [],
}

export function WallpaperDialog(props: WallpaperDialogProps) {
    const dictionary = getGlobal();
    const formSchema = z.object({
        title: z.string().refine(value => value !== '', {
            message: dictionary['local'].title_cannot_be_empty,
        }),
        isPlaylist: z.boolean().optional(),
        file: z.instanceof(File, {
            message: dictionary['local'].upload_failed,
        }).optional(),
        wallpapers: z.array(z.any()).optional(),
    });


    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues
    })
    const [isOver, setIsOver] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importing, setImporting] = useState(false);
    const importingFile = form.watch("file");
    const isPlaylist = form.watch("isPlaylist");
    const wallpapers = form.watch("wallpapers");
    const [importedFile, setImportedFile] = useState<{
        name: string,
        url: string,
        fileType: string | null
    }>();
    const [uploading, setUploading] = useState(false); //是否正在上传
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [loadVideoError, setLoadVideoError] = useState(false);
    const previewVideoRef = useRef<HTMLVideoElement>(null);
    const previewImgRef = useRef<HTMLImageElement>(null);
    const [openSelectWallpaperDialog, setOpenSelectWallpaperDialog] = useState(false);

    //每次打开重置状态
    useEffect(() => {
        if (!props.open) {
            setIsOver(false);
            setProgress(0);
            setImporting(false);
            setImportedFile(undefined);
            abortController?.abort();
        } else {
            setLoadVideoError(false);
            const isPlaylist = WallpaperMeta.isPlaylist(props.wallpaper?.meta);
            if (props.wallpaper) {
                if (!isPlaylist) {
                    setImportedFile({
                        name: props.wallpaper?.fileName || "",
                        url: props.wallpaper?.fileUrl || "",
                        fileType: Wallpaper.getFileType(props.wallpaper?.fileUrl)
                    });
                }
            }

            defaultValues.wallpapers = props.wallpaper?.meta.wallpapers || [];
            defaultValues.title = props.wallpaper?.meta.title || "";
            defaultValues.isPlaylist = isPlaylist;

            form.reset(defaultValues);
        }
    }, [form, props.open, props.wallpaper]);

    const uploadFile = useCallback(async (file: File) => {
        setLoadVideoError(false);
        setProgress(0);
        setImporting(true);
        setImportedFile(undefined);

        abortController?.abort();
        abortController = new AbortController();

        const progressCallback = (progress: number) => {
            console.log(`导入进度: ${progress}%`);
            progress = Math.floor(progress);
            setProgress(progress);
        };
        try {
            const base64String = await processFile(file, progressCallback, abortController);
            var { data } = await api.uploadToTmp(file.name, base64String);
            console.log(data);
            setImportedFile({
                name: file.name,
                url: data || "",
                fileType: Wallpaper.getFileType(data)
            });
            const fileName = file.name.split(".")[0];
            if (!form.getValues("title"))
                form.setValue("title", fileName);
        } catch (e) {
            toast.error((e as any).message);
        } finally {
            setImporting(false);
            inputRef.current?.focus();
        }
    }, [form]);

    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        form.setValue("file", e.dataTransfer.files[0]);
    }, [form]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        // 检查鼠标是否真的离开了元素，还是只是移动到了子元素
        if (e.currentTarget.contains(e.relatedTarget as Node)) {
            // 鼠标指针移动到了子元素，不做任何处理
            return;
        }
        setIsOver(false);
    }, []);

    //form.file变化后自动上传
    useEffect(() => {
        if (importingFile && importingFile.size > 0) {
            uploadFile(importingFile);
        }
    }, [uploadFile, importingFile]);

    const submitWallpaper = useCallback(async (data: z.infer<typeof formSchema>) => {
        if (uploading)
            return;

        if (!importedFile) {
            toast.warning(dictionary['local'].file_not_selected);
            return;
        }

        //判断文件大小
        if (data.file && data.file.size > 1024 * 1024 * 1024) {
            toast.warning(dictionary['local'].upload_size_limit_exceeded);
            return;
        }

        if (!data.title)
            data.title = dictionary['local'].default_title;
        console.log(data);
        if (importing) {
            toast.info(dictionary['local'].updating);
            return;
        }
        setUploading(true);

        let previewElement;
        let eWidth;
        let eHeight;
        if (importedFile.fileType === "img") {
            previewElement = previewImgRef.current;
            eWidth = previewElement?.width || 0;
            eHeight = previewElement?.height || 0;
        } else {
            previewElement = previewVideoRef.current;
            eWidth = previewElement?.videoWidth || 0;
            eHeight = previewElement?.videoHeight || 0;
        }

        let coverUrl = null;
        try {
            const imgData = await generateCoverImage(previewElement, eWidth, eHeight);
            //Blob转换成base64
            const base64String = await getBase64FromBlob(imgData);
            const fileName = importedFile.name.split(".")[0] + ".jpg";
            var { data: tmpCoverUrl } = await api.uploadToTmp(fileName, base64String);
            coverUrl = tmpCoverUrl;
        } catch (e) {
            console.error(e);
            toast.error(dictionary['local'].generate_cover_failed);
        }
        var wallpaper = new Wallpaper({
            ...props.wallpaper,
        });

        wallpaper.meta.title = data.title;
        wallpaper.meta.type = WallpaperType.Video;//todo 更细节的判断
        wallpaper.coverUrl = coverUrl || "";
        wallpaper.fileUrl = importedFile.url;

        if (props.wallpaper) {
            var res = await api.updateWallpaperNew(wallpaper, props.wallpaper.fileUrl || "");
            if (!res.data)
                toast.warning(dictionary['local'].update_failed_format_not_supported);
            else {
                toast.success(dictionary['local'].update_successful);
                props.createSuccess?.();
            }
        }
        else {
            var res = await api.createWallpaperNew(wallpaper);
            if (!res.data)
                toast.warning(dictionary['local'].create_failed_format_not_supported);
            else {
                toast.success(dictionary['local'].create_successful);
                props.createSuccess?.();
            }
        }
        setUploading(false);
    }, [dictionary, importedFile, importing, props, uploading]);

    const submitPlaylist = useCallback(async (data: z.infer<typeof formSchema>) => {
        if (!data.wallpapers?.length) {
            toast.warning(dictionary['local'].empty_wallpaper_not_allowed_in_list_mode);
            return;
        }
        console.log("submitPlaylist", data);
        setUploading(true);

        let previewWallpapers = data.wallpapers
            .map((wallpaper: Wallpaper) => wallpaper.coverUrl)
            .filter((coverUrl): coverUrl is string => coverUrl !== undefined);

        const imgData = await generatePlaylistCover(previewWallpapers);
        //Blob转换成base64
        const base64String = await getBase64FromBlob(imgData);
        const fileName = "cover.jpg";
        var { data: coverUrl } = await api.uploadToTmp(fileName, base64String);
        var wallpaper = new Wallpaper({
            ...props.wallpaper,
        });

        wallpaper.meta.title = data.title;
        wallpaper.meta.wallpapers = data.wallpapers;
        wallpaper.meta.type = WallpaperType.Playlist;
        wallpaper.coverUrl = coverUrl || "";

        if (props.wallpaper?.meta.id) {
            var res = await api.updateWallpaperNew(wallpaper, props.wallpaper.fileUrl || "");
            if (!res.data)
                toast.warning(dictionary['local'].update_failed_format_not_supported);
            else {
                toast.success(dictionary['local'].update_successful);
                props.createSuccess?.();
            }
        }
        else {
            // var res = await api.createWallpaper(data.title, coverUrl || "", importedFile.url);
            var res = await api.createWallpaperNew(wallpaper);
            if (!res.data)
                toast.warning(dictionary['local'].create_failed_format_not_supported);
            else {
                toast.success(dictionary['local'].create_successful);
                props.createSuccess?.();
            }
        }
        setUploading(false);
    }, [dictionary, props]);

    const onSubmit = useCallback((data: z.infer<typeof formSchema>) => {
        if (data.isPlaylist) {
            return submitPlaylist(data);
        }
        else {
            return submitWallpaper(data);
        }
    }, [submitPlaylist, submitWallpaper]);

    const onClose = useCallback((e: boolean) => {
        var value = form.getValues();
        //自己实现，因为formState.isDirty不准确
        var isDirty = JSON.stringify(value) != JSON.stringify(defaultValues)
        // console.log(JSON.stringify(value), JSON.stringify(defaultValues), isDirty);
        if (!e && isDirty) {
            confirm(dictionary['local'].not_saved_confirm_close) && props.onChange(e);
            return;
        }
        props.onChange(e);
    }, [dictionary, form, props]);

    return <Dialog open={props.open} onOpenChange={onClose} >
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>{props.wallpaper ?
                    `${isPlaylist ? dictionary['local'].edit_list : dictionary['local'].edit_wallpaper}` :
                    `${isPlaylist ? dictionary['local'].create_playlist : dictionary['local'].create_wallpaper}`}
                </DialogTitle>
                <DialogDescription>
                    {`${isPlaylist ? dictionary['local'].local_list_description : dictionary['local'].local_wallpaper_description}`}
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh]">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="mx-1">
                        <div className="mt-2 mb-3">
                            <div className="flex flex-col space-y-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input autoFocus placeholder={dictionary['local'].input_title} {...field} autoComplete="off" ref={inputRef} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {/* 是否是播放列表 */}
                                <FormField
                                    control={form.control}
                                    name="isPlaylist"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <label className="flex items-center space-x-2">
                                                    <Switch
                                                        disabled={uploading || importing}
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                    <span>{dictionary['local'].play_list}</span>
                                                </label>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {/* 壁纸界面 */}
                                {isPlaylist === false && <>
                                    {!importedFile
                                        ?
                                        <>
                                            {!importing ?
                                                <div
                                                    onClick={() => { fileInputRef.current?.click() }}
                                                    onDragOver={handleDragOver}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={handleDrop}
                                                    className={cn(["flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer hover:border-primary hover:bg-muted", {
                                                        "border-primary bg-muted": isOver,
                                                    }])}>
                                                    <UploadCloudIcon className="text-foreground  w-5 h-5 mb-2" />
                                                    <p className="text-gray-500">{isOver ? dictionary['local'].release_mouse : dictionary['local'].click_to_import_or_drag_file_here}</p>
                                                </div>
                                                :
                                                <div>
                                                    <span>{dictionary['local'].importing}</span>
                                                    <Progress className="mt-2" value={progress} />
                                                </div>
                                            }
                                        </>
                                        :
                                        <>
                                            <h4 className="text-[#9CA3AF] mb-2">{dictionary['local'].imported_files}</h4>
                                            <div className="flex justify-between items-center text-[#9CA3AF]">
                                                <div>
                                                    <div className="flex justify-between items-center">
                                                        <p>{importedFile.name}</p>
                                                        <Button type="button" variant="ghost" onClick={() => {
                                                            setImportedFile(undefined);
                                                            if (fileInputRef.current)
                                                                fileInputRef.current.value = '';
                                                            form.setValue("file", undefined);
                                                        }}>
                                                            <DeleteIcon className="h-6 w-6" />
                                                        </Button>
                                                    </div>
                                                    {
                                                        importedFile.fileType === "video" && <video
                                                            onError={(e) => {
                                                                console.error('Video loading error:', e);
                                                                setLoadVideoError(true);
                                                            }}
                                                            autoPlay={true} ref={previewVideoRef} className="object-contain">
                                                            <source src={importedFile.url} />
                                                        </video>
                                                    }
                                                    {
                                                        loadVideoError && <>{dictionary['local'].failed_to_load_video}</>
                                                    }
                                                    {
                                                        importedFile.fileType === "img" &&
                                                        <picture>
                                                            <img alt="预览图" src={importedFile.url} ref={previewImgRef} />
                                                        </picture>
                                                    }
                                                </div>
                                            </div>
                                        </>
                                    }
                                </>}
                                {/* 列表界面 */}
                                {isPlaylist && <>
                                    {!wallpapers || wallpapers.length === 0 && <>
                                        <div
                                            onClick={() => { setOpenSelectWallpaperDialog(true) }}
                                            className={cn(["flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer hover:border-primary hover:bg-muted", {
                                                "border-primary bg-muted": isOver,
                                            }])}>
                                            <ListPlus className="text-foreground w-5 h-5 mb-2" />
                                            <p className="text-gray-500">{dictionary['local'].set_wallpaper_list}</p>
                                        </div>
                                    </>}
                                    {wallpapers && wallpapers.length > 0 && <div className="flex flex-col space-y-2">
                                        <ul role="list" className="grid grid-cols-2 gap-x-4 gap-y-8 p-2">
                                            {wallpapers.map((wallpaper, index) => (
                                                <li key={index} className="relative">
                                                    <div className="group aspect-h-7 aspect-w-10 block w-full overflow-hidden rounded-lg" title={wallpaper.meta.title}>
                                                        <picture>
                                                            <img src={wallpaper.coverUrl}
                                                                height="200"
                                                                width="300"
                                                                style={{
                                                                    aspectRatio: "300/200",
                                                                    objectFit: "cover",
                                                                }}
                                                                alt={wallpaper.title} className="pointer-events-none object-cover group-hover:opacity-75" />
                                                        </picture>
                                                    </div>
                                                    <p className="pointer-events-none mt-2 block truncate text-sm font-medium">{wallpaper.meta.title}</p>
                                                    <Button className="absolute top-0 right-0" type="button" variant="ghost" onClick={() => {
                                                        form.setValue("wallpapers", wallpapers.filter((_, i) => i !== index));
                                                    }}>
                                                        <DeleteIcon className="h-6 w-6" />
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>}
                                </>}
                                <FormField
                                    control={form.control}
                                    name="file"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input {...field}
                                                    accept="image/*,video/*"
                                                    type="file"
                                                    value={undefined}
                                                    ref={fileInputRef}
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => {
                                                        const file = e.target.files ? e.target.files[0] : null;
                                                        field.onChange(file);
                                                    }
                                                    } />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <SelectWallpaperDialog selectedWallpapers={props.wallpaper?.meta.wallpapers || []}
                            open={openSelectWallpaperDialog}
                            onChangeOpen={setOpenSelectWallpaperDialog}
                            onSaveSuccess={(wallpapers) => {
                                if (!form.getValues("title"))
                                    form.setValue("title", dictionary['local'].unnamed_list);
                                //append
                                form.setValue("wallpapers", [...(form.getValues("wallpapers") || []), ...wallpapers]);
                            }}
                        />
                    </form>
                </Form>
            </ScrollArea>
            <DialogFooter>
                <div className="flex w-full justify-between">
                    {
                        isPlaylist ? <Button type="button" variant="secondary" onClick={() => { setOpenSelectWallpaperDialog(true) }}>
                            {dictionary['local'].add_wallpaper}
                        </Button> : <div></div>
                    }
                    <Button type="submit" disabled={uploading} onClick={() => {
                        form.handleSubmit(onSubmit)();
                    }}>
                        {uploading && <div className="animate-spin w-4 h-4 border-t-2 border-muted rounded-full mr-2" />}
                        {uploading ? dictionary['local'].creating : dictionary['local'].save}
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog >
}