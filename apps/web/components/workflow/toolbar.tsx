"use client";
import { useReactFlow } from "@xyflow/react";

interface Props {
  workflowName: string;
  onSave: () => void;
  onNameChange: (name: string) => void;
  isDirty: boolean;
  isSaving: boolean;
}

export function Toolbar({ workflowName, onSave, onNameChange, isDirty, isSaving }: Props) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  return (
    <div className="flex items-center justify-between border-b bg-white px-4 py-2">
      <div className="flex items-center gap-3">
        <input
          value={workflowName}
          onChange={(e) => onNameChange(e.target.value)}
          className="text-lg font-bold bg-transparent border-none outline-none focus:ring-0 text-gray-800 placeholder-gray-400"
          placeholder="Workflow name"
        />
        {isDirty && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Unsaved</span>}
      </div>

      <div className="flex items-center gap-2">
        {/* Zoom controls */}
        <button
          onClick={() => zoomIn()}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          title="Zoom in"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={() => zoomOut()}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          title="Zoom out"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={() => fitView({ padding: 0.2 })}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          title="Fit view"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-1.5 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? "Saving..." : isDirty ? "Save" : "Saved"}
        </button>
      </div>
    </div>
  );
}
