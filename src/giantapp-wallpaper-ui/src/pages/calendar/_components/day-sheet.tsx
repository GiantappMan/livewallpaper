import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SlotsEditor } from "./slots-editor";
import {
    CalendarDayPlan,
    CalendarRef,
    CalendarRefInfo,
    CalendarSlots,
} from "@/lib/client/types";

interface Props {
    date: string | null; // YYYY-MM-DD
    plan?: CalendarDayPlan;
    /** 该日期命中的节日/每周规则名（单日编排会盖过它，需要明说） */
    hitName?: string | null;
    resolve: (ref?: CalendarRef | null) => CalendarRefInfo | undefined;
    onRecord: (
        fileUrl: string | undefined,
        coverUrl?: string,
        title?: string,
        filePath?: string
    ) => void;
    onPreview?: (ref: CalendarRef) => void;
    onSave: (plan: CalendarDayPlan) => Promise<boolean>;
    /** 显式清除这天的全部编排（父层负责保存；成功后本组件自行关闭） */
    onClearDay?: () => Promise<boolean>;
    onClose: () => void;
    t: any;
    local: any;
}

/** 单日编辑：当天是否启用 + 全天壁纸 + 分时段壁纸。 */
export function DaySheet({ date, plan, hitName, resolve, onRecord, onPreview, onSave, onClearDay, onClose, t, local }: Props) {
    const [draft, setDraft] = useState<CalendarDayPlan | null>(null);
    const [saving, setSaving] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);

    useEffect(() => {
        if (date) {
            setDraft(
                plan ?? {
                    date,
                    enabled: true,
                    allDay: null,
                    segments: [],
                }
            );
            setConfirmClear(false);
        }
    }, [date, plan]);

    const updateSlots = (slots: CalendarSlots) => {
        setDraft((prev) => (prev ? { ...prev, ...slots } : prev));
    };

    const save = async () => {
        if (!draft) return;
        // 空段不再被后端静默丢弃：保存前明确拦下
        if ((draft.segments ?? []).some((s) => !s.wallpaper?.filePath)) {
            toast.error(t.seg_empty);
            return;
        }
        setSaving(true);
        const ok = await onSave(draft);
        setSaving(false);
        if (ok) onClose();
    };

    const clearDay = async () => {
        setConfirmClear(false);
        if (!onClearDay) return;
        const ok = await onClearDay();
        if (ok) onClose();
    };

    const title = date
        ? new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))).toLocaleDateString(
              undefined,
              { month: "long", day: "numeric", weekday: "long" }
          )
        : "";

    return (
        <Sheet open={date !== null} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="flex flex-col gap-0 sm:max-w-[560px]">
                <SheetHeader className="pb-2">
                    <SheetTitle>{t.edit_day}</SheetTitle>
                    <SheetDescription>{title}</SheetDescription>
                </SheetHeader>

                {draft && (
                    <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
                        <div className="flex items-center justify-between rounded-lg border bg-card/40 px-3 py-2.5">
                            <Label htmlFor="day-enabled" className="text-sm">
                                {t.day_enabled}
                            </Label>
                            <Switch
                                id="day-enabled"
                                checked={draft.enabled}
                                onCheckedChange={(enabled) => setDraft({ ...draft, enabled })}
                            />
                        </div>

                        <p className="text-xs text-muted-foreground">{t.day_editor_hint}</p>

                        {hitName && (
                            <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                {t.hit_hint.replace("{0}", hitName)}
                            </p>
                        )}

                        <SlotsEditor
                            slots={{ allDay: draft.allDay, segments: draft.segments }}
                            onChange={updateSlots}
                            resolve={resolve}
                            onRecord={onRecord}
                            onPreview={onPreview}
                            t={t}
                            local={local}
                        />
                    </div>
                )}

                <SheetFooter className="flex-row items-center gap-2 border-t px-4 py-3">
                    {plan && onClearDay && (
                        <Button
                            variant="ghost"
                            className="mr-auto text-destructive hover:text-destructive"
                            onClick={() => setConfirmClear(true)}
                        >
                            {t.clear_day}
                        </Button>
                    )}
                    <Button variant="outline" onClick={onClose}>
                        {local.cancel}
                    </Button>
                    <Button onClick={save} disabled={saving}>
                        {local.confirm}
                    </Button>
                </SheetFooter>

                {/* 清除确认 */}
                <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t.clear_day}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t.clear_confirm.replace("{0}", title)}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{local.cancel}</AlertDialogCancel>
                            <AlertDialogAction onClick={clearDay}>{local.confirm}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </SheetContent>
        </Sheet>
    );
}
