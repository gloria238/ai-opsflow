"use client";
import { createContext, useContext, useState, useRef, useEffect } from "react";

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

export function SelectTrigger({ placeholder, className = "" }: { placeholder?: string; className?: string }) {
  const { value, setOpen, open } = useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 ${className}`}
    >
      <span className={value ? "" : "text-gray-400"}>{value || placeholder || "Select..."}</span>
      <span className="text-xs text-gray-400 ml-2">▼</span>
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
    <div ref={ref} className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-md py-1 max-h-60 overflow-auto">
      {children}
    </div>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const { value: selectedValue, onValueChange, setOpen } = useContext(SelectContext);
  const isSelected = selectedValue === value;

  return (
    <div
      className={`px-3 py-2 text-sm cursor-pointer ${isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100"}`}
      onClick={() => { onValueChange(value); setOpen(false); }}
    >
      {children}
      {isSelected && <span className="float-right text-blue-600">✓</span>}
    </div>
  );
}
