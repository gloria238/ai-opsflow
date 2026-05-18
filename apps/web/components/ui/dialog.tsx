"use client";
import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

interface DialogContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const DialogContext = createContext<DialogContextValue>({ open: false, setOpen: () => {} });

export function Dialog({ children, open: controlledOpen, onOpenChange }: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback((v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  }, [isControlled, onOpenChange]);

  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ children }: { children: React.ReactNode }) {
  const { setOpen } = useContext(DialogContext);
  return <div onClick={() => setOpen(true)}>{children}</div>;
}

export function DialogContent({ children, title }: { children: React.ReactNode; title?: string }) {
  const { open, setOpen } = useContext(DialogContext);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === overlayRef.current) setOpen(false); }}
    >
      <div className="bg-bg-card rounded-xl shadow-lg border border-border w-full max-w-md mx-4 overflow-visible">
        {title && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h3 className="font-semibold text-text">{title}</h3>
            <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text text-lg leading-none transition-colors">&times;</button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
