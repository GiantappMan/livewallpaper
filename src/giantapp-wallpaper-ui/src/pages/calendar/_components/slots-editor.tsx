import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectWallpaperDialog } from "@/pages/home/_components/select-wallpaper-dialog";
import {
    CalendarRef,
    CalendarRefInfo,
    CalendarSlots,
    CalendarTimeSegment,
} from "@/lib/client/types";
import { PlayIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

type PickTarget = { kind: "allDay" } | { kind: "segment"; index: number };

interface Props {
    slots: CalendarSlots;
    onChange: (slots: CalendarSlots) => void;
    /** 引用 -> 展示信息（后端 previews + 本地新选择的合并视图） */
    resolve: (ref?: CalendarRef | null) => CalendarRefInfo | undefined;
    /** 选完壁纸的登记回调（父层记录本地展示信息） */
    onRecord: (
        wallpaperFileUrl: string | undefined,
        coverUrl?: string,
        title?: string,
        filePath?: string
    ) => void;
    /** 立即在桌面预览（缺省不显示预览按钮） */
    onPreview?: (ref: CalendarRef) => void;
    t: any;
    local: any;
}

/** 全天壁纸 + 时间段编辑器：单日编排与节假日/每周规则共用。 */
export function SlotsEditor({ slots, onChange, resolve, onRecord, onPreview, t, local }: Props) {
    const [picking, setPicking] = useState<PickTarget | null>(null);
    const segments = slots.segments ?? [];

    const applyRef = (target: PickTarget, filePath: string, dir?: string | null, fileName?: string | null) => {
        const ref: CalendarRef = { filePath, dir: dir ?? undefined, fileName: fileName ?? undefined };
        if (target.kind === "allDay") {
            onChange({ ...slots, allDay: ref });
        } else {
            const segs = [...segments];
            segs[target.index] = { ...segs[target.index], wallpaper: ref };
            onChange({ ...slots, segments: segs });
        }
    };

    const updateSegment = (index: number, patch: Partial<CalendarTimeSegment>) => {
        const segs = [...segments];
        segs[index] = { ...segs[index], ...patch };
        onChange({ ...slots, segments: segs });
    };

    const removeSegment = (index: number) => {
        onChange({ ...slots, segments: segments.filter((_, i) => i !== index) });
    };

    const addSegment = () => {
        onChange({
            ...slots,
            segments: [...segments, { start: "08:00", end: "22:00", wallpaper: { filePath: "" } }],
        });
    };

    const slotRow = (target: PickTarget, ref: CalendarRef | null | undefined) => {
        const info = resolve(ref);
        const isSegment = target.kind === "segment";
        return (
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <img
                    src={info?.coverUrl || info?.fileUrl || "/wp-placeholder.webp"}
                    alt=""
                    className="h-9 w-14 shrink-0 rounded bg-muted object-cover"
                />
                <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {info?.title || t.unset}
                </div>
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => setPicking(target)}>
                    {isSegment ? t.pick : t.set}
                </Button>
                {ref?.filePath && onPreview && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground"
                        title={t.preview}
                        onClick={() => onPreview(ref)}
                    >
                        <PlayIcon className="h-4 w-4" />
                    </Button>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-3">
            {/* 全天 */}
            <div className="flex items-center gap-2 rounded-lg border bg-card/40 p-2">
                <div className="w-14 shrink-0 text-xs font-medium">{t.all_day}</div>
                {slotRow({ kind: "allDay" }, slots.allDay)}
                {slots.allDay?.filePath && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground"
                        title={t.clear}
                        onClick={() => onChange({ ...slots, allDay: null })}
                    >
                        <TrashIcon className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* 时间段 */}
            {segments.map((seg, index) => (
                <div key={index} className="rounded-lg border bg-card/40 p-2">
                    <div className="flex items-center gap-2">
                        <Input
                            type="time"
                            value={seg.start}
                            onChange={(e) => updateSegment(index, { start: e.target.value })}
                            className="h-8 w-[104px] shrink-0"
                        />
                        <span className="shrink-0 text-xs text-muted-foreground">–</span>
                        <Input
                            type="time"
                            value={seg.end}
                            onChange={(e) => updateSegment(index, { end: e.target.value })}
                            className="h-8 w-[104px] shrink-0"
                        />
                        <span className="truncate text-xs text-muted-foreground" title={t.cross_midnight_hint}>
                            {seg.end <= seg.start ? t.cross_midnight : ""}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto h-8 w-8 shrink-0 text-muted-foreground"
                            title={local.delete}
                            onClick={() => removeSegment(index)}
                        >
                            <TrashIcon className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">{slotRow({ kind: "segment", index }, seg.wallpaper)}</div>
                </div>
            ))}

            <Button variant="outline" size="sm" className="w-full border-dashed" onClick={addSegment}>
                <PlusIcon className="mr-1.5 h-4 w-4" />
                {t.add_segment}
            </Button>

            {/* 选壁纸（日历场景放行顶层播放列表） */}
            <SelectWallpaperDialog
                open={picking !== null}
                onChangeOpen={(open) => {
                    if (!open) setPicking(null);
                }}
                includePlaylist
                onSaveSuccess={(wallpapers) => {
                    const w = wallpapers[0];
                    if (!w || !picking) return;
                    if (w.filePath) {
                        onRecord(w.fileUrl, w.coverUrl, w.meta?.title, w.filePath);
                        applyRef(picking, w.filePath, w.dir, w.fileName);
                    } else if (w.fileUrl) {
                        // 浏览器演示模式没有 filePath，退化为用 URL 当路径占位
                        onRecord(w.fileUrl, w.coverUrl, w.meta?.title, w.fileUrl);
                        applyRef(picking, w.fileUrl);
                    }
                }}            />
        </div>
    );
}
