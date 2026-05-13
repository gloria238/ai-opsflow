"use client";
import { createContext, useContext, useState, useRef, useEffect } from "react";

interface DropdownContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const DropdownContext = createContext<DropdownContextValue>({ open: false, setOpen: () => {} });

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <DropdownContext.Provider value={{ open, setOpen }}>{children}</DropdownContext.Provider>;
}

export function DropdownMenuTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const { setOpen, open } = useContext(DropdownContext);
  return (
    <div onClick={() => setOpen(!open)} className="inline-flex cursor-pointer">
      {children}
    </div>
  );
}

export function DropdownMenuContent({ children, align = "start" }: { children: React.ReactNode; align?: "start" | "end" }) {
  const { open, setOpen } = useContext(DropdownContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={`absolute z-50 min-w-[8rem] rounded-lg border bg-white shadow-md py-1 mt-1 ${align === "end" ? "right-0" : "left-0"}`}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const { setOpen } = useContext(DropdownContext);
  return (
    <div
      className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
      onClick={() => { onClick?.(); setOpen(false); }}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSeparator() {
  return <div className="h-px bg-gray-200 my-1" />;
}
