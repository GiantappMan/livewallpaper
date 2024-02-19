import { Button } from '@/components/ui/button';
import React from 'react';
import { WallpaperIcon, ListPlus } from "lucide-react"

interface Props {
    //创建壁纸回调
    createWallpaper: () => void;
    //创建列表回调
    createList: () => void;
}

function CreateWallpaperButton({ createWallpaper, createList }: Props) {
    return (
        <div className="flex w-full h-full hover:text-primary justify-center items-center">
            <div className="flex justify-center items-center space-x-4">
                <Button title='创建壁纸' variant="link" className="flex items-center transform transition-transform duration-300 hover:scale-125" onClick={() => createWallpaper()}>
                    <WallpaperIcon className="h-5 w-5" />
                </Button>
                <Button title='创建列表' variant="link" className="flex items-center transform transition-transform duration-300 hover:scale-125" onClick={() => createList()}>
                    <ListPlus className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}

export default CreateWallpaperButton;