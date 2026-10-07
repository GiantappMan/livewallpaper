import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon } from "@heroicons/react/24/outline";
import { langAtom, langDictAtom } from "@/atoms/lang";
import api from "@/lib/client/api";
import {
    CalendarDayPlan,
    CalendarNow,
    CalendarPayload,
    CalendarPreviewDay,
    CalendarPreviews,
    CalendarRef,
    CalendarRefInfo,
    CalendarSource,
    Wallpaper,
} from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DaySheet } from "./_components/day-sheet";
import { RulesDialog } from "./_components/rules-dialog";

const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtDate = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;

/** 内置节日 key → 词典键（与后端 FESTIVAL_PRESETS 对齐；清明是节气日不进表） */
const FEST_LABEL_KEY: Record<string, string> = {
    new_year: "preset_new_year",
    spring: "preset_spring_festival",
    lantern: "preset_lantern",
    valentine: "preset_valentine",
    women: "preset_women",
    labor: "preset_labor",
    children: "preset_children",
    dragon_boat: "preset_dragon_boat",
    qixi: "preset_qixi",
    mid_autumn: "preset_mid_autumn",
    national: "preset_national",
    double_ninth: "preset_double_ninth",
    christmas: "preset_christmas",
};

/** 月历网格：周一开头，固定 6 行 42 格，返回 "YYYY-MM-DD"。 */
function monthGrid(year: number, month: number): string[] {
    const first = new Date(year, month - 1, 1);
    const offset = (first.getDay() + 6) % 7; // 周一为 0
    const start = new Date(year, month - 1, 1 - offset);
    const cells: string[] = [];
    for (let i = 0; i < 42; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        cells.push(fmtDate(d.getFullYear(), d.getMonth() + 1, d.getDate()));
    }
    return cells;
}

const Page = () => {
    const dictionary = useAtomValue(langDictAtom);
    const lang = useAtomValue(langAtom);
    const t = (dictionary["calendar"] ?? {}) as any;
    const local = dictionary["local"] ?? {};

    const today = new Date();
    const [payload, setPayload] = useState<CalendarPayload | null>(null);
    const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
    const [previewDays, setPreviewDays] = useState<Record<string, CalendarPreviewDay>>({});
    const [localInfo, setLocalInfo] = useState<CalendarPreviews>({});
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [rulesOpen, setRulesOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [nowInfo, setNowInfo] = useState<CalendarNow | null>(null);
    const wallpapersCacheRef = useRef<Wallpaper[] | null>(null);
    const fetchedYearsRef = useRef<Set<number>>(new Set());

    const doc = payload?.doc;

    const loadDoc = useCallback(async () => {
        const res = await api.getCalendar();
        if (!res.error && res.data) setPayload(res.data);
    }, []);

    useEffect(() => {
        loadDoc();
    }, [loadDoc]);

    /** 「此刻」条：当前时刻的求值结果，30 秒自刷（跨段/跨天可见） */
    const refreshNow = useCallback(async () => {
        const res = await api.getCalendarNow();
        if (!res.error && res.data) setNowInfo(res.data);
    }, []);

    useEffect(() => {
        refreshNow();
        const timer = setInterval(refreshNow, 30000);
        return () => clearInterval(timer);
    }, [refreshNow]);

    const cells = useMemo(() => monthGrid(view.year, view.month), [view]);
    const gridYears = useMemo(
        () => Array.from(new Set(cells.map((c) => Number(c.slice(0, 4))))),
        [cells]
    );

    const fetchPreview = useCallback(async (years: number[], force = false) => {
        const pending = years.filter((y) => force || !fetchedYearsRef.current.has(y));
        if (pending.length === 0) return;
        for (const y of pending) {
            const res = await api.getCalendarPreview(y);
            if (!res.error && res.data) {
                fetchedYearsRef.current.add(y);
                setPreviewDays((prev) => {
                    const next = { ...prev };
                    for (const day of res.data!.days) {
                        // 覆盖式合并：新的预览包含全年口径（未命中规则也会给 null）
                        next[day.date] = day;
                    }
                    return next;
                });
                if (res.data.previews) {
                    setLocalInfo((prev) => ({ ...prev, ...res.data!.previews }));
                }
            }
        }
    }, []);

    useEffect(() => {
        fetchPreview(gridYears);
    }, [gridYears, fetchPreview]);

    const refreshPreviews = useCallback(() => {
        fetchedYearsRef.current.clear();
        return fetchPreview(gridYears, true);
    }, [fetchPreview, gridYears]);

    const resolve = useCallback(
        (ref?: CalendarRef | null): CalendarRefInfo | undefined => {
            if (!ref?.filePath) return undefined;
            return payload?.previews[ref.filePath] ?? localInfo[ref.filePath];
        },
        [payload, localInfo]
    );

    /** 选完壁纸登记本地展示信息（保存/预览刷新前立即可见） */
    const record = useCallback((
        fileUrl: string | undefined,
        coverUrl?: string,
        title?: string,
        filePath?: string
    ) => {
        if (!filePath) return;
        setLocalInfo((prev) => ({
            ...prev,
            [filePath]: { fileUrl: fileUrl ?? "", coverUrl: coverUrl, title: title },
        }));
    }, []);

    /** 立即在桌面预览：从壁纸库找到完整对象后播放 */
    const previewOnDesktop = useCallback(async (ref: CalendarRef) => {
        let list = wallpapersCacheRef.current;
        if (!list) {
            const res = await api.getWallpapers();
            if (res.error || !res.data) return;
            list = res.data;
            wallpapersCacheRef.current = list;
        }
        const found = list.find((w) => w.filePath === ref.filePath);
        if (!found) {
            toast.error(t.preview_not_found);
            return;
        }
        await api.showWallpaper(found);
    }, [t]);

    const saveDoc = useCallback(
        async (doc_: import("@/lib/client/types").CalendarDoc): Promise<boolean> => {
            setSaving(true);
            const res = await api.saveCalendar(doc_);
            setSaving(false);
            if (res.error || !res.data) {
                toast.error(t.save_failed ?? String(res.error ?? ""));
                return false;
            }
            setPayload(res.data);
            refreshPreviews();
            toast.success(t.saved);
            return true;
        },
        [t, refreshPreviews]
    );

    const saveDayPlan = useCallback(
        async (plan: CalendarDayPlan): Promise<boolean> => {
            if (!doc) return false;
            const others = doc.days.filter((d) => d.date !== plan.date);
            const days = plan.enabled || plan.allDay?.filePath || (plan.segments?.length ?? 0) > 0
                ? [...others, plan].sort((a, b) => a.date.localeCompare(b.date))
                : others; // 全空且未启用：视为删除
            return saveDoc({ ...doc, days });
        },
        [doc, saveDoc]
    );

    const saveRules = useCallback(
        async (yearly: import("@/lib/client/types").CalendarYearlyRule[], weekly: import("@/lib/client/types").CalendarWeeklyRule[]): Promise<boolean> => {
            if (!doc) return false;
            return saveDoc({ ...doc, yearly, weekly });
        },
        [doc, saveDoc]
    );

    const monthLabel = useMemo(() => {
        try {
            return new Date(view.year, view.month - 1, 1).toLocaleDateString(lang || undefined, {
                year: "numeric",
                month: "long",
            });
        } catch {
            return `${view.year}/${view.month}`;
        }
    }, [view, lang]);

    const shiftMonth = (delta: number) => {
        setView((prev) => {
            const d = new Date(prev.year, prev.month - 1 + delta, 1);
            return { year: d.getFullYear(), month: d.getMonth() + 1 };
        });
    };

    const todayStr = fmtDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const weekdayLabels = [1, 2, 3, 4, 5, 6, 0].map((wd) => t[`weekday_${wd}`]);
    const invalidCount = payload?.invalid?.length ?? 0;
    const hasAnyRule =
        !!doc && (doc.days.length > 0 || doc.yearly.length > 0 || doc.weekly.length > 0);

    const badgeOf = (source?: CalendarSource | null): { text: string; cls: string } | null => {
        if (!source) return null;
        // 单日编排不标徽章：封面缩略图本身就是证据；徽章只标"来源规则"（节日名/周名）
        switch (source.kind) {
            case "day":
                return null;
            case "yearly":
                return { text: source.name || t.badge_yearly, cls: "bg-rose-600/90" };
            case "weekly":
                return { text: source.name || t.badge_weekly, cls: "bg-emerald-600/90" };
        }
    };

    return (
        <div className="h-[calc(100vh_-_var(--app-titlebar-h))] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-5 md:py-6">
                {/* 标题与工具栏 */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="mr-auto">
                        <h1 className="text-2xl font-semibold">{t.title}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border bg-card/40 px-3 py-2">
                        <Switch
                            id="calendar-enabled"
                            checked={doc?.enabled ?? false}
                            disabled={!doc || saving}
                            onCheckedChange={(enabled) => doc && saveDoc({ ...doc, enabled })}
                        />
                        <label htmlFor="calendar-enabled" className="text-sm font-medium select-none">
                            {t.takeover}
                        </label>
                    </div>
                    <Button variant="outline" onClick={() => setRulesOpen(true)} disabled={!doc}>
                        {t.rules}
                    </Button>
                </div>

                {/* 「此刻」条：回答“现在这张壁纸是谁安排的” */}
                {nowInfo && (
                    <div className={`mt-4 flex items-center gap-2.5 rounded-lg border bg-card/40 px-3.5 py-2 ${!nowInfo.enabled ? "opacity-70" : ""}`}>
                        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                            {t.now} · {nowInfo.time}
                        </span>
                        {nowInfo.enabled ? (
                            nowInfo.info ? (
                                <>
                                    <img
                                        src={nowInfo.info.coverUrl || nowInfo.info.fileUrl || "/wp-placeholder.webp"}
                                        className="h-8 w-12 shrink-0 rounded bg-muted object-cover"
                                        alt=""
                                    />
                                    <span className="truncate text-sm">{nowInfo.info.title || "—"}</span>
                                    {(() => {
                                        const b = nowInfo.source ? badgeOf(nowInfo.source) : null;
                                        return b ? (
                                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] leading-none text-white ${b.cls}`}>{b.text}</span>
                                        ) : null;
                                    })()}
                                </>
                            ) : (
                                <span className="text-sm text-muted-foreground">{t.now_none}</span>
                            )
                        ) : (
                            <span className="text-sm text-muted-foreground">{t.now_disabled}</span>
                        )}
                    </div>
                )}

                {/* 状态提示 */}
                {invalidCount > 0 && (
                    <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400">
                        {t.invalid_warning.replace("{n}", String(invalidCount))}
                    </div>
                )}
                {doc && !hasAnyRule && (
                    <div className="mt-4 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                        {t.getting_started}
                    </div>
                )}

                {/* 月份导航 */}
                <div className="mt-5 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" aria-label={t.prev_month} onClick={() => shiftMonth(-1)}>
                            <ChevronLeftIcon className="h-5 w-5" />
                        </Button>
                        <span className="min-w-[9rem] text-center text-base font-semibold">{monthLabel}</span>
                        <Button variant="ghost" size="icon" aria-label={t.next_month} onClick={() => shiftMonth(1)}>
                            <ChevronRightIcon className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="ml-2"
                            onClick={() => setView({ year: today.getFullYear(), month: today.getMonth() + 1 })}
                        >
                            {t.today}
                        </Button>
                    </div>
                    <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
                        <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
                            {t.badge_yearly}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                            {t.badge_weekly}
                        </span>
                    </div>
                </div>

                {/* 月历（未接管时整片置灰，状态不再自相矛盾；仍可点进去编辑） */}
                <div className={`mt-3 ${doc && !doc.enabled ? "opacity-45 grayscale-[.5]" : ""}`}>
                    <div className="grid grid-cols-7 gap-1.5">
                    {weekdayLabels.map((label, i) => (
                        <div key={i} className="pb-1 text-center text-xs font-medium text-muted-foreground">
                            {label}
                        </div>
                    ))}
                    {cells.map((date) => {
                        const dayNum = Number(date.slice(8, 10));
                        const inMonth = Number(date.slice(5, 7)) === view.month;
                        const info = previewDays[date];
                        const badge = badgeOf(info?.source);
                        const festText = ((info?.festivals ?? []) as string[])
                            .map((id) => t[FEST_LABEL_KEY[id]])
                            .filter(Boolean)
                            .join(" · ");
                        const ref = info?.filePath ? { filePath: info.filePath } : null;
                        const info_ = resolve(ref);
                        // 多时段 → 拼图（按时间排序的去重壁纸，最多展示 4 张）
                        const wallInfos = ((info?.wallpapers ?? []) as string[])
                            .map((p) => payload?.previews[p])
                            .filter(Boolean) as CalendarRefInfo[];
                        const isToday = date === todayStr;
                        return (
                            <button
                                key={date}
                                type="button"
                                onClick={() => setSelectedDate(date)}
                                className={`relative aspect-[1/1.05] overflow-hidden rounded-lg border text-left transition hover:ring-1 hover:ring-primary ${
                                    inMonth ? "bg-card/40" : "bg-transparent opacity-45"
                                } ${isToday ? "ring-2 ring-primary" : ""}`}
                                title={[festText, badge?.text].filter(Boolean).join(" · ")}
                            >
                                {wallInfos.length >= 2 ? (
                                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px opacity-55">
                                        {wallInfos.slice(0, 4).map((inf, i) => (
                                            <img
                                                key={i}
                                                src={inf.coverUrl || inf.fileUrl || "/wp-placeholder.webp"}
                                                alt=""
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                            />
                                        ))}
                                    </div>
                                ) : info_ ? (
                                    <img
                                        src={info_.coverUrl || info_.fileUrl || "/wp-placeholder.webp"}
                                        alt=""
                                        className="absolute inset-0 h-full w-full object-cover opacity-55"
                                        loading="lazy"
                                    />
                                ) : null}
                                <div className="relative flex h-full flex-col p-1.5">
                                    <span
                                        className={`text-xs font-semibold ${
                                            isToday
                                                ? "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                                                : ""
                                        }`}
                                    >
                                        {dayNum}
                                    </span>
                                    {(() => {
                                        const fest = festText;
                                        const lunar = (info?.lunar as string) || "";
                                        const sub = fest || lunar;
                                        if (!sub) return null;
                                        return (
                                            <span className={`mt-0.5 truncate text-[10px] font-semibold leading-tight ${fest ? "text-rose-600 dark:text-rose-300" : "font-normal text-muted-foreground"}`}>
                                                {sub}
                                            </span>
                                        );
                                    })()}
                                    {badge && (
                                        <span
                                            className={`mt-auto w-fit max-w-full truncate rounded px-1 py-0.5 text-[10px] leading-none text-white ${badge.cls}`}
                                        >
                                            {badge.text}
                                        </span>
                                    )}
                                    {(info?.segmentCount ?? 0) > 0 && (
                                        <span className="absolute right-1 top-1 rounded bg-black/50 px-1 text-[10px] leading-4 text-white">
                                            {info!.segmentCount}
                                        </span>
                                    )}
                                    {info_ && (
                                        <PlayIcon className="absolute right-1 bottom-1 h-3.5 w-3.5 text-white/80" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                    </div>
                </div>
            </div>

            {/* 单日编辑 */}
            <DaySheet
                date={selectedDate}
                plan={selectedDate ? doc?.days.find((d) => d.date === selectedDate) : undefined}
                hitName={
                    selectedDate && previewDays[selectedDate]?.source && previewDays[selectedDate]!.source!.kind !== "day"
                        ? previewDays[selectedDate]!.source!.name || (previewDays[selectedDate]!.source!.kind === "yearly" ? t.badge_yearly : t.badge_weekly)
                        : null
                }
                resolve={resolve}
                onRecord={record}
                onPreview={previewOnDesktop}
                onSave={saveDayPlan}
                onClearDay={async () => {
                    if (!doc || !selectedDate) return false;
                    return saveDoc({ ...doc, days: doc.days.filter((d) => d.date !== selectedDate) });
                }}
                onClose={() => setSelectedDate(null)}
                t={t}
                local={local}
            />

            {/* 规则管理 */}
            <RulesDialog
                open={rulesOpen}
                doc={doc ?? { enabled: false, days: [], yearly: [], weekly: [] }}
                resolve={resolve}
                onRecord={record}
                onPreview={previewOnDesktop}
                onSave={saveRules}
                onClose={() => setRulesOpen(false)}
                t={t}
                local={local}
            />
        </div>
    );
};

export default Page;
