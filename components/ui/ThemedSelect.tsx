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
                className={`w-full px-3.5 rounded-[12px] text-[15px] font-normal bg-[#FAFAF7] border border-[#EAE9DF] outline-none transition-all flex items-center justify-between cursor-pointer select-none ${isOpen ? "ring-2 ring-[#A2AB89] bg-white border-[#A2AB89]" : "hover:border-[#A2AB89]"
                    } ${className || "h-[48px]"}`}
            >
                <span
                    className={`truncate pr-2 ${value ? "text-[var(--text-primary)] font-normal" : "text-[var(--text-muted)] font-normal"
                        }`}
                >
                    {displayLabel}
                </span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? "rotate-180 text-[#5E6442]" : ""
                        }`}
                />
            </div>

            {/* Floating Menu Popover */}
            {isOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-[280px] overflow-y-auto rounded-[14px] bg-[#FFFFFF] border border-[#EAE9DF] shadow-[0_4px_20px_rgba(0,0,0,0.08)] py-1.5 animate-in fade-in zoom-in-95 duration-100 divide-y divide-[#F5F4EF]">
                    {groups.map((group, groupIdx) => (
                        <div key={group.name || groupIdx} className="py-1 first:pt-0 last:pb-0">
                            {group.name && (
                                <div className="px-3.5 py-1.5 text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase bg-[#FAFAF7]/80">
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
                                                ? "bg-[#5E6442] text-white font-medium"
                                                : "text-[var(--text-primary)] hover:bg-[#F5F4EF] hover:text-[#5E6442]"
                                            }`}
                                    >
                                        <span className="truncate pr-2">{opt.label}</span>
                                        {isSelected && <Check size={16} className="shrink-0 text-white" />}
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
