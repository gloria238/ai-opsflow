"use client";
import { createContext, useContext, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SelectContextValue {
  value: string;
  onValueChange: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}

const SelectContext = createContext<SelectContextValue>({
  value: "", onValueChange: () => {}, open: false, setOpen: () => {},
});

export function Select({ value, onValueChange, children }: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ placeholder, className }: { placeholder?: string; className?: string }) {
  const { value, setOpen, open } = useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "w-full flex items-center justify-between rounded-xl border border-border bg-bg-card px-3.5 py-2.5 text-sm text-text",
        "hover:bg-bg-subtle transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
        className,
      )}
    >
      <span className={value ? "" : "text-text-muted"}>{value || placeholder || "Select..."}</span>
      <span className="text-xs text-text-muted ml-2">&#9660;</span>
    </button>
  );
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useContext(SelectContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div ref={ref} className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-bg-card shadow-lg py-1 max-h-60 overflow-auto">
      {children}
    </div>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const { value: selectedValue, onValueChange, setOpen } = useContext(SelectContext);
  const isSelected = selectedValue === value;

  return (
    <div
      className={cn(
        "px-3 py-2 text-sm cursor-pointer transition-colors duration-100",
        isSelected ? "bg-accent-soft text-accent" : "text-text hover:bg-bg-subtle",
      )}
      onClick={() => { onValueChange(value); setOpen(false); }}
    >
      {children}
      {isSelected && <span className="float-right text-accent">&#10003;</span>}
    </div>
  );
}
