import { Button } from "@/components/ui/button";
import { SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, Sheet } from "@/components/ui/sheet";
import { Playlist } from "@/lib/client/types/playlist";

//定义组件
const PlaylistSheet = ({ selectedPlaylist }: { selectedPlaylist?: Playlist }) => {
    return <Sheet modal={true}>
        <SheetTrigger asChild>
            <Button variant="ghost" className="hover:text-primary px-3" title="播放列表">
                <svg
                    className=" h-6 w-6"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <line x1="8" x2="21" y1="6" y2="6" />
                    <line x1="8" x2="21" y1="12" y2="12" />
                    <line x1="8" x2="21" y1="18" y2="18" />
                    <line x1="3" x2="3.01" y1="6" y2="6" />
                    <line x1="3" x2="3.01" y1="12" y2="12" />
                    <line x1="3" x2="3.01" y1="18" y2="18" />
                </svg>
            </Button>
        </SheetTrigger>
        <SheetContent>
            <SheetHeader>
                <SheetTitle>播放列表</SheetTitle>
                <SheetDescription>
                    This action cannot be undone. This will permanently delete your account
                    and remove your data from our servers.
                </SheetDescription>
            </SheetHeader>
            {/* 选中播放列表的壁纸列表 */}
            <div className="flex flex-col space-y-2">
                {selectedPlaylist?.wallpapers.map((item, index) => {
                    return <div key={index} className="flex items-center p-0 m-0" >
                        <picture className="mr-2">
                            <img
                                alt="Cover"
                                title={item.meta?.title}
                                className="rounded-lg object-scale-cover aspect-square"
                                height={50}
                                src={item.coverUrl || "/wp-placeholder.webp"}
                                width={50}
                            />
                        </picture>
                        <div className="flex flex-col text-sm truncate">
                            <div className="font-semibold">{item?.meta?.title}</div>
                            <div >{item?.meta?.description}</div>
                        </div>
                    </div>
                })}
            </div>
        </SheetContent>
    </Sheet>
}
export default PlaylistSheet;