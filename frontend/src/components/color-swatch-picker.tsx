"use client";

import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TEACHER_50_PALETTE, getPaletteColorByHex } from "@/lib/palette";
import { Check } from "lucide-react";

interface ColorSwatchPickerProps {
  value: string;
  onChange: (hex: string) => void;
  usedColors?: string[]; // hex codes of colors used by other teachers
  disabled?: boolean;
}

export const ColorSwatchPicker: React.FC<ColorSwatchPickerProps> = ({
  value,
  onChange,
  usedColors = [],
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const currentColor = getPaletteColorByHex(value) || {
    hex: value || "#fef08a",
    name: "Επιλεγμένο",
    group: "",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className="group relative flex items-center justify-center p-0 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-500 cursor-pointer disabled:cursor-not-allowed mx-auto"
        title={`Χρώμα: ${currentColor.name} (${currentColor.hex}) - Κλικ για αλλαγή (50 διαθέσιμα)`}
      >
        <div
          className="w-5 h-5 rounded-full border border-black/20 group-hover:scale-110 group-hover:shadow-sm transition-transform shadow-2xs"
          style={{ backgroundColor: currentColor.hex }}
        />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[310px] p-3 bg-white border border-zinc-200 shadow-xl rounded-xl z-[80]"
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
          <div>
            <h4 className="text-xs font-semibold text-zinc-900">
              Παλέτα Εκπαιδευτικών
            </h4>
            <p className="text-[10px] text-zinc-500">
              50 προσεκτικά επιλεγμένα χρώματα
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/80">
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
              style={{ backgroundColor: currentColor.hex }}
            />
            <span className="font-medium truncate max-w-[90px]">
              {currentColor.name}
            </span>
          </div>
        </div>

        {/* 5x10 Swatches Grid */}
        <div className="grid grid-cols-10 gap-1.5 p-1 bg-zinc-50/80 rounded-lg border border-zinc-100">
          {TEACHER_50_PALETTE.map((colorItem) => {
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
                className={`relative w-5.5 h-5.5 rounded-md border transition-all flex items-center justify-center cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-zinc-900 scale-110 shadow-xs border-black/30 z-10"
                    : "border-black/15 hover:scale-115 hover:shadow-xs hover:border-black/30"
                }`}
                style={{ backgroundColor: colorItem.hex }}
              >
                {isSelected && (
                  <Check
                    className="w-3 h-3 stroke-[3]"
                    style={{ color: colorItem.textColor || "#18181b" }}
                  />
                )}
                {isUsed && !isSelected && (
                  <span
                    className="w-1 h-1 rounded-full opacity-60 pointer-events-none"
                    style={{ backgroundColor: colorItem.textColor || "#18181b" }}
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
          <span className="font-mono text-zinc-400">50/50</span>
        </div>
      </PopoverContent>
    </Popover>
  );
};
