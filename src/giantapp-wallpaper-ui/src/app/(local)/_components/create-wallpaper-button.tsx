import { Button } from '@/components/ui/button';
import React, { useState } from 'react';

interface Props {
    //创建壁纸回调
    createWallpaper: () => void;
    //创建列表回调
    createList: () => void;
}

function CreateWallpaperButton({ createWallpaper, createList }: Props) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="flex w-full h-full hover:text-primary"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Button
                aria-label="创建壁纸"
                className="flex w-full h-full "
                title="创建壁纸"
                variant="ghost"
                onClick={() => createWallpaper()}
            >
                {
                    !isHovered && <svg
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
                }
                {isHovered && (
                    <div className='flex flex-col w-full h-full space-y-2'>
                        <Button variant="outline" className='h-full border-2 border-primary' onClick={() => createWallpaper()}>创建壁纸</Button>
                        <Button variant="outline" className='h-full border-2 border-primary' onClick={() => createList()}>创建列表</Button>
                    </div>
                )}
            </Button>
        </div>
    );
}

export default CreateWallpaperButton;