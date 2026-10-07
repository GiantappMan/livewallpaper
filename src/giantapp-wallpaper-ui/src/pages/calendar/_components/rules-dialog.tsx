import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SlotsEditor } from "./slots-editor";
import {
    CalendarDoc,
    CalendarRef,
    CalendarRefInfo,
    CalendarSlots,
    CalendarWeeklyRule,
    CalendarYearlyDate,
    CalendarYearlyRule,
} from "@/lib/client/types";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

/** 节日预设（按评审结论：节气日清明无法用公历/农历固定表达，本期不进预设）。 */
const PRESETS: { key: string; date: CalendarYearlyDate }[] = [
    { key: "preset_new_year", date: { kind: "solar", month: 1, day: 1 } },
    { key: "preset_spring_festival", date: { kind: "lunar", month: 1, day: 1, leap: false } },
    { key: "preset_lantern", date: { kind: "lunar", month: 1, day: 15, leap: false } },
    { key: "preset_valentine", date: { kind: "solar", month: 2, day: 14 } },
    { key: "preset_women", date: { kind: "solar", month: 3, day: 8 } },
    { key: "preset_labor", date: { kind: "solar", month: 5, day: 1 } },
    { key: "preset_children", date: { kind: "solar", month: 6, day: 1 } },
    { key: "preset_dragon_boat", date: { kind: "lunar", month: 5, day: 5, leap: false } },
    { key: "preset_qixi", date: { kind: "lunar", month: 7, day: 7, leap: false } },
    { key: "preset_mid_autumn", date: { kind: "lunar", month: 8, day: 15, leap: false } },
    { key: "preset_national", date: { kind: "solar", month: 10, day: 1 } },
    { key: "preset_double_ninth", date: { kind: "lunar", month: 9, day: 9, leap: false } },
    { key: "preset_christmas", date: { kind: "solar", month: 12, day: 25 } },
];

interface Props {
    open: boolean;
    doc: CalendarDoc;
    resolve: (ref?: CalendarRef | null) => CalendarRefInfo | undefined;
    onRecord: (
        fileUrl: string | undefined,
        coverUrl?: string,
        title?: string,
        filePath?: string
    ) => void;
    onPreview?: (ref: CalendarRef) => void;
    onSave: (yearly: CalendarYearlyRule[], weekly: CalendarWeeklyRule[]) => Promise<boolean>;
    onClose: () => void;
    t: any;
    local: any;
}

/** 节假日与每周规则管理：文档序即优先级（同日多条取靠前者）。 */
export function RulesDialog({ open, doc, resolve, onRecord, onPreview, onSave, onClose, t, local }: Props) {
    const [yearly, setYearly] = useState<CalendarYearlyRule[]>([]);
    const [weekly, setWeekly] = useState<CalendarWeeklyRule[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setYearly(doc.yearly.map((r) => ({ ...r })));
            setWeekly(doc.weekly.map((r) => ({ ...r })));
        }
    }, [open, doc]);

    const updateYearlySlots = (id: string, slots: CalendarSlots) => {
        setYearly((prev) => prev.map((r) => (r.id === id ? { ...r, ...slots } : r)));
    };
    const updateWeeklySlots = (id: string, slots: CalendarSlots) => {
        setWeekly((prev) => prev.map((r) => (r.id === id ? { ...r, ...slots } : r)));
    };

    const addYearlyFromPreset = (key: string) => {
        const preset = PRESETS.find((p) => p.key === key);
        if (!preset) return;
        setYearly((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                name: t[preset.key] ?? preset.key,
                enabled: true,
                date: preset.date,
                allDay: null,
                segments: [],
            },
        ]);
    };

    const addYearlyBlank = () => {
        setYearly((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                name: t.new_rule,
                enabled: true,
                date: { kind: "solar", month: 1, day: 1 },
                allDay: null,
                segments: [],
            },
        ]);
    };

    const addWeekly = () => {
        setWeekly((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                name: t.weekend_default_name,
                enabled: true,
                weekdays: [0, 6],
                allDay: null,
                segments: [],
            },
        ]);
    };

    const save = async () => {
        setSaving(true);
        const ok = await onSave(yearly, weekly);
        setSaving(false);
        if (ok) onClose();
    };

    const dateLabel = (date?: CalendarYearlyDate | null) => {
        if (!date) return t.unset;
        if (date.kind === "solar") return `${t.solar} ${date.month}/${date.day}`;
        return `${t.lunar} ${date.month}-${date.day}${date.leap ? ` · ${t.leap_month}` : ""}`;
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="flex max-h-[92vh] w-full max-w-[760px] flex-col">
                <DialogHeader>
                    <DialogTitle>{t.rules}</DialogTitle>
                    <DialogDescription>{t.rules_hint}</DialogDescription>
                </DialogHeader>

                <div className="-mx-1 flex-1 space-y-6 overflow-y-auto px-1 py-2">
                    {/* 节日规则 */}
                    <section>
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">{t.yearly_rules}</h3>
                            <div className="flex items-center gap-2">
                                <select
                                    className="h-8 rounded-md border bg-background px-2 text-xs"
                                    value=""
                                    onChange={(e) => addYearlyFromPreset(e.target.value)}
                                >
                                    <option value="">{t.add_from_preset}</option>
                                    {PRESETS.map((p) => (
                                        <option key={p.key} value={p.key}>
                                            {t[p.key]}
                                            {` (${dateLabel(p.date)})`}
                                        </option>
                                    ))}
                                </select>
                                <Button variant="outline" size="sm" onClick={addYearlyBlank}>
                                    <PlusIcon className="mr-1.5 h-4 w-4" />
                                    {t.add_yearly}
                                </Button>
                            </div>
                        </div>
                        {yearly.length === 0 && (
                            <div className="mt-2 rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                                {t.empty_yearly}
                            </div>
                        )}
                        <div className="mt-2 space-y-2">
                            {yearly.map((rule, index) => (
                                <div key={rule.id} className="rounded-lg border bg-card/40 p-3">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={rule.name}
                                            onChange={(e) =>
                                                setYearly((prev) =>
                                                    prev.map((r) => (r.id === rule.id ? { ...r, name: e.target.value } : r))
                                                )
                                            }
                                            className="h-8 w-36 shrink-0"
                                            placeholder={t.rule_name}
                                        />
                                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                            {dateLabel(rule.date)}
                                        </span>
                                        <Switch
                                            checked={rule.enabled}
                                            onCheckedChange={(enabled) =>
                                                setYearly((prev) =>
                                                    prev.map((r) => (r.id === rule.id ? { ...r, enabled } : r))
                                                )
                                            }
                                            className="ml-auto"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0 text-muted-foreground"
                                            onClick={() => setYearly((prev) => prev.filter((r) => r.id !== rule.id))}
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {/* 日期编辑 */}
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                        <select
                                            className="h-7 rounded-md border bg-background px-1.5"
                                            value={rule.date?.kind ?? "solar"}
                                            onChange={(e) =>
                                                setYearly((prev) =>
                                                    prev.map((r) =>
                                                        r.id === rule.id
                                                            ? {
                                                                  ...r,
                                                                  date:
                                                                      e.target.value === "lunar"
                                                                          ? { kind: "lunar", month: 1, day: 1, leap: false }
                                                                          : { kind: "solar", month: 1, day: 1 },
                                                              }
                                                            : r
                                                    )
                                                )
                                            }
                                        >
                                            <option value="solar">{t.solar}</option>
                                            <option value="lunar">{t.lunar}</option>
                                        </select>
                                        <Label className="text-xs text-muted-foreground">{t.month}</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={12}
                                            value={rule.date?.month ?? 1}
                                            onChange={(e) =>
                                                setYearly((prev) =>
                                                    prev.map((r) =>
                                                        r.id === rule.id && r.date
                                                            ? { ...r, date: { ...r.date, month: clampInt(e.target.value, 1, 12) } }
                                                            : r
                                                    )
                                                )
                                            }
                                            className="h-7 w-16"
                                        />
                                        <Label className="text-xs text-muted-foreground">{t.day}</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={30}
                                            value={rule.date?.day ?? 1}
                                            onChange={(e) =>
                                                setYearly((prev) =>
                                                    prev.map((r) =>
                                                        r.id === rule.id && r.date
                                                            ? { ...r, date: { ...r.date, day: clampInt(e.target.value, 1, 30) } }
                                                            : r
                                                    )
                                                )
                                            }
                                            className="h-7 w-16"
                                        />
                                        {rule.date?.kind === "lunar" && (
                                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <input
                                                    type="checkbox"
                                                    checked={rule.date.leap}
                                                    onChange={(e) =>
                                                        setYearly((prev) =>
                                                            prev.map((r) =>
                                                                r.id === rule.id && r.date?.kind === "lunar"
                                                                    ? { ...r, date: { ...r.date, leap: e.target.checked } }
                                                                    : r
                                                            )
                                                        )
                                                    }
                                                />
                                                {t.leap_month}
                                            </label>
                                        )}
                                        <span className="text-muted-foreground">#{index + 1}</span>
                                    </div>
                                    <div className="mt-2">
                                        <SlotsEditor
                                            slots={{ allDay: rule.allDay, segments: rule.segments }}
                                            onChange={(slots) => updateYearlySlots(rule.id, slots)}
                                            resolve={resolve}
                                            onRecord={onRecord}
                                            onPreview={onPreview}
                                            t={t}
                                            local={local}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 每周规则 */}
                    <section>
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">{t.weekly_rules}</h3>
                            <Button variant="outline" size="sm" onClick={addWeekly}>
                                <PlusIcon className="mr-1.5 h-4 w-4" />
                                {t.add_weekly}
                            </Button>
                        </div>
                        {weekly.length === 0 && (
                            <div className="mt-2 rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                                {t.empty_weekly}
                            </div>
                        )}
                        <div className="mt-2 space-y-2">
                            {weekly.map((rule) => (
                                <div key={rule.id} className="rounded-lg border bg-card/40 p-3">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={rule.name}
                                            onChange={(e) =>
                                                setWeekly((prev) =>
                                                    prev.map((r) => (r.id === rule.id ? { ...r, name: e.target.value } : r))
                                                )
                                            }
                                            className="h-8 w-36 shrink-0"
                                            placeholder={t.rule_name}
                                        />
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
                                                const active = rule.weekdays.includes(wd);
                                                return (
                                                    <button
                                                        key={wd}
                                                        type="button"
                                                        className={`h-7 w-7 rounded-full text-xs ${
                                                            active
                                                                ? "bg-primary text-primary-foreground"
                                                                : "bg-muted text-muted-foreground"
                                                        }`}
                                                        onClick={() =>
                                                            setWeekly((prev) =>
                                                                prev.map((r) =>
                                                                    r.id === rule.id
                                                                        ? {
                                                                              ...r,
                                                                              weekdays: active
                                                                                  ? r.weekdays.filter((w) => w !== wd)
                                                                                  : [...r.weekdays, wd].sort(),
                                                                          }
                                                                        : r
                                                                )
                                                            )
                                                        }
                                                    >
                                                        {t[`weekday_${wd}`]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <Switch
                                            checked={rule.enabled}
                                            onCheckedChange={(enabled) =>
                                                setWeekly((prev) =>
                                                    prev.map((r) => (r.id === rule.id ? { ...r, enabled } : r))
                                                )
                                            }
                                            className="ml-auto"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0 text-muted-foreground"
                                            onClick={() => setWeekly((prev) => prev.filter((r) => r.id !== rule.id))}
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="mt-2">
                                        <SlotsEditor
                                            slots={{ allDay: rule.allDay, segments: rule.segments }}
                                            onChange={(slots) => updateWeeklySlots(rule.id, slots)}
                                            resolve={resolve}
                                            onRecord={onRecord}
                                            onPreview={onPreview}
                                            t={t}
                                            local={local}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <DialogFooter className="flex-row justify-end gap-2 border-t pt-3">
                    <Button variant="outline" onClick={onClose}>
                        {local.cancel}
                    </Button>
                    <Button onClick={save} disabled={saving}>
                        {local.confirm}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function clampInt(text: string, min: number, max: number): number {
    const v = Math.round(Number(text));
    if (Number.isNaN(v)) return min;
    return Math.min(max, Math.max(min, v));
}
