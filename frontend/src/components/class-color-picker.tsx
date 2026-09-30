"use client";

import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CLASS_15_PALETTE, getClassPaletteColorByHex } from "@/lib/palette";
import { Check } from "lucide-react";

interface ClassColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  usedColors?: string[];
  disabled?: boolean;
}

export const ClassColorPicker: React.FC<ClassColorPickerProps> = ({
  value,
  onChange,
  usedColors = [],
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const currentColor = getClassPaletteColorByHex(value) || {
    hex: value || "#3b82f6",
    name: "Επιλεγμένο",
    group: "",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className="group relative flex items-center justify-center p-0 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-500 cursor-pointer disabled:cursor-not-allowed mx-auto"
        title={`Χρώμα τμήματος: ${currentColor.name} (${currentColor.hex}) - Κλικ για αλλαγή (15 διαθέσιμα)`}
      >
        <div
          className="w-5 h-5 rounded-full border border-black/20 group-hover:scale-110 group-hover:shadow-sm transition-transform shadow-2xs"
          style={{ backgroundColor: currentColor.hex }}
        />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[260px] p-3 bg-white border border-zinc-200 shadow-xl rounded-xl z-[80]"
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
          <div>
            <h4 className="text-xs font-semibold text-zinc-900">
              Παλέτα Τμημάτων
            </h4>
            <p className="text-[10px] text-zinc-500">
              15 διακριτά χρώματα
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/80">
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
              style={{ backgroundColor: currentColor.hex }}
            />
            <span className="font-medium truncate max-w-[80px]">
              {currentColor.name}
            </span>
          </div>
        </div>

        {/* 3x5 Grid for 15 Colors */}
        <div className="grid grid-cols-5 gap-2 p-1.5 bg-zinc-50/80 rounded-lg border border-zinc-100">
          {CLASS_15_PALETTE.map((colorItem) => {
            const isSelected =
              currentColor.hex.toLowerCase() === colorItem.hex.toLowerCase();
            const isUsed = usedColors
              .map((c) => c.toLowerCase())
              .includes(colorItem.hex.toLowerCase());

            return (
              <button
                key={colorItem.hex}
                type="button"
                onClick={() => {
                  onChange(colorItem.hex);
                  setOpen(false);
                }}
                title={`${colorItem.name} (${colorItem.hex})${
                  isUsed && !isSelected ? " • Χρησιμοποιείται ήδη" : ""
                }`}
                className={`relative w-7 h-7 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-zinc-900 scale-105 shadow-xs border-black/30 z-10"
                    : "border-black/15 hover:scale-110 hover:shadow-xs hover:border-black/30"
                }`}
                style={{ backgroundColor: colorItem.hex }}
              >
                {isSelected && (
                  <Check
                    className="w-3.5 h-3.5 stroke-[3] text-white drop-shadow-xs"
                    style={{ color: colorItem.textColor || "#ffffff" }}
                  />
                )}
                {isUsed && !isSelected && (
                  <span
                    className="w-1.5 h-1.5 rounded-full opacity-70 pointer-events-none"
                    style={{ backgroundColor: colorItem.textColor || "#ffffff" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 mt-2 border-t border-zinc-100">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            Κουκκίδα = Σε χρήση
          </span>
          <span className="font-mono text-zinc-400">15/15</span>
        </div>
      </PopoverContent>
    </Popover>
  );
};
