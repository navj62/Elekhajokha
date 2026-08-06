"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface ThemedDatePickerProps {
    value: string; // YYYY-MM-DD format
    onChange: (date: string) => void;
    placeholder?: string;
    className?: string;
}

export function ThemedDatePicker({
    value,
    onChange,
    placeholder = "dd-mm-yyyy",
    className,
}: ThemedDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Determine which month to display in the calendar
    const getInitialDate = () => {
        if (value) {
            const [y, m] = value.split("-").map(Number);
            return new Date(y, m - 1, 1);
        }
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    };

    const [viewDate, setViewDate] = useState<Date>(getInitialDate);

    useEffect(() => {
        if (value) {
            const [y, m] = value.split("-").map(Number);
            setViewDate(new Date(y, m - 1, 1));
        }
    }, [value]);

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    // Format YYYY-MM-DD for display (e.g. 01 Jul 2026)
    const formatDisplayDate = (val: string) => {
        if (!val) return "";
        const [y, m, d] = val.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    // Generate calendar grid calculations
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const handleSelectDay = (day: number) => {
        const formatted = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        onChange(formatted);
        setIsOpen(false);
    };

    const handleSelectToday = () => {
        const today = new Date();
        const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        onChange(formatted);
        setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className ? "w-full" : "inline-block"}`} ref={containerRef}>
            {/* Input Trigger Box */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={className ? `${className} flex items-center justify-between gap-3 cursor-pointer select-none` : "h-9 px-3 rounded-[10px] text-[13px] font-medium text-foreground bg-muted border border-border flex items-center justify-between gap-3 cursor-pointer hover:border-ring transition-all min-w-[140px] select-none"}
            >
                <span className={value ? "text-foreground" : "text-muted-foreground-subtle"}>
                    {value ? formatDisplayDate(value) : placeholder}
                </span>
                <CalendarIcon size={15} className="text-primary shrink-0" />
            </div>

            {/* Themed Calendar Popover (60:30:10 Theme) */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1.5 z-50 p-4 rounded-2xl bg-popover border border-border shadow-(--card-shadow) w-[280px] text-popover-foreground animate-in fade-in zoom-in-95 duration-150 select-none overflow-hidden">
                    {/* 30% SECONDARY: Deep Olive Header Bar */}
                    <div className="bg-primary text-primary-foreground px-4 py-3 -mx-4 -mt-4 mb-3 flex items-center justify-between font-bold text-[14px] shadow-sm">
                        <span className="tracking-wide">{monthNames[month]} {year}</span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handlePrevMonth}
                                className="p-1 rounded-full hover:bg-primary-foreground/15 transition-colors text-primary-foreground"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={handleNextMonth}
                                className="p-1 rounded-full hover:bg-primary-foreground/15 transition-colors text-primary-foreground"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* 30% SECONDARY: Crisp Olive Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-primary mb-2 uppercase tracking-wider">
                        <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[12px]">
                        {/* Previous month trailing days */}
                        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                            <div key={`prev-${i}`} className="py-1.5 text-muted-foreground-subtle opacity-40">
                                {daysInPrevMonth - firstDayOfWeek + i + 1}
                            </div>
                        ))}

                        {/* Current month days */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1;
                            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                            const isSelected = value === dateStr;
                            const isToday = new Date().toISOString().slice(0, 10) === dateStr;

                            return (
                                <button
                                    key={`day-${dayNum}`}
                                    type="button"
                                    onClick={() => handleSelectDay(dayNum)}
                                    className={`py-1.5 rounded-lg font-medium transition-all ${isSelected
                                        // 10% ACCENT: Vibrant Amber/Gold Pop for selected day!
                                        // text-background (not white) so the label stays legible when
                                        // --gold lightens to #E0B44A on dark.
                                        ? "bg-gold text-background font-bold shadow-md shadow-gold/30 scale-105"
                                        : isToday
                                            // 30% SECONDARY: Today indicator
                                            ? "bg-accent text-accent-foreground font-bold border border-ring hover:bg-accent/80"
                                            // 60% DOMINANT: Clean neutral background
                                            : "hover:bg-accent text-foreground"
                                        }`}
                                >
                                    {dayNum}
                                </button>
                            );
                        })}
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-[12px] font-semibold">
                        <button
                            type="button"
                            onClick={() => { onChange(""); setIsOpen(false); }}
                            className="px-2.5 py-1 rounded-md text-muted-foreground-subtle hover:bg-accent hover:text-foreground transition-all"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={handleSelectToday}
                            className="px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
