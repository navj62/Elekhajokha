"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface ThemedSelectOption {
    value: string;
    label: string;
    group?: string;
}

export interface ThemedSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: (string | ThemedSelectOption)[];
    placeholder?: string;
    className?: string;
}

export function ThemedSelect({
    value,
    onChange,
    options,
    placeholder = "Select...",
    className = "",
}: ThemedSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const normalizedOptions: ThemedSelectOption[] = options.map((opt) =>
        typeof opt === "string" ? { value: opt, label: opt } : opt
    );

    const selectedOption = normalizedOptions.find((opt) => opt.value === value);
    const displayLabel = selectedOption ? selectedOption.label : value || placeholder;

    const groups: { name: string; items: ThemedSelectOption[] }[] = [];
    normalizedOptions.forEach((opt) => {
        const groupName = opt.group || "";
        let g = groups.find((grp) => grp.name === groupName);
        if (!g) {
            g = { name: groupName, items: [] };
            groups.push(g);
        }
        g.items.push(opt);
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Trigger Box */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-3.5 rounded-[12px] text-[15px] font-normal bg-card-alt border border-border outline-none transition-all flex items-center justify-between cursor-pointer select-none ${isOpen ? "ring-2 ring-ring bg-card border-ring" : "hover:border-ring"
                    } ${className || "h-[48px]"}`}
            >
                <span
                    className={`truncate pr-2 ${value ? "text-foreground font-normal" : "text-muted-foreground-subtle font-normal"
                        }`}
                >
                    {displayLabel}
                </span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-muted-foreground-subtle transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : ""
                        }`}
                />
            </div>

            {/* Floating Menu Popover */}
            {isOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-[280px] overflow-y-auto rounded-[14px] bg-popover border border-border shadow-(--card-shadow) py-1.5 animate-in fade-in zoom-in-95 duration-100 divide-y divide-border">
                    {groups.map((group, groupIdx) => (
                        <div key={group.name || groupIdx} className="py-1 first:pt-0 last:pb-0">
                            {group.name && (
                                <div className="px-3.5 py-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground-subtle uppercase bg-card-alt/80">
                                    {group.name}
                                </div>
                            )}
                            {group.items.map((opt) => {
                                const isSelected = opt.value === value;
                                return (
                                    <div
                                        key={opt.value + opt.label}
                                        onClick={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                        }}
                                        className={`px-3.5 py-2.5 text-[14.5px] flex items-center justify-between cursor-pointer transition-colors ${isSelected
                                                ? "bg-primary text-primary-foreground font-medium"
                                                : "text-foreground hover:bg-muted hover:text-primary"
                                            }`}
                                    >
                                        <span className="truncate pr-2">{opt.label}</span>
                                        {isSelected && <Check size={16} className="shrink-0 text-primary-foreground" />}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
