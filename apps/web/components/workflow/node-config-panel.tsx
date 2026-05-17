"use client";
import { useState, useEffect, useCallback } from "react";
import type { WorkflowFlowNode } from "./types";

interface Props {
  node: WorkflowFlowNode | null;
  onUpdate: (nodeId: string, data: { label?: string; config?: Record<string, unknown> }) => void;
  onClose: () => void;
  readOnly?: boolean;
}

export function NodeConfigPanel({ node, onUpdate, onClose, readOnly }: Props) {
  const [label, setLabel] = useState(node?.data?.label || "");
  const [config, setConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || "");
      setConfig(
        Object.fromEntries(
          Object.entries(node.data.config || {}).map(([k, v]) => [k, String(v ?? "")])
        )
      );
    }
  }, [node]);

  const updateConfig = useCallback(
    (key: string, value: string) => {
      const next = { ...config, [key]: value };
      setConfig(next);
    },
    [config]
  );

  if (!node) {
    return (
      <div className="w-72 border-l bg-gray-50 p-4 flex items-center justify-center text-sm text-gray-400">
        Select a node to configure
      </div>
    );
  }

  const nodeType = node.data?.nodeType;

  const renderConfigFields = () => {
    switch (nodeType) {
      case "trigger":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Trigger type</label>
              <select
                value={config.type || "manual"}
                onChange={(e) => updateConfig("type", e.target.value)}
                disabled={readOnly}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="manual">Manual</option>
                <option value="webhook">Webhook</option>
                <option value="schedule">Schedule</option>
              </select>
            </div>
            {config.type === "schedule" && (
              <div>
                <label className="text-xs font-medium text-gray-600">Cron expression</label>
                <input
                  value={config.cron || ""}
                  onChange={(e) => updateConfig("cron", e.target.value)}
                  placeholder="0 9 * * 1"
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                  disabled={readOnly}
                />
              </div>
            )}
          </div>
        );

      case "action":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Action type</label>
              <select
                value={config.action || ""}
                onChange={(e) => updateConfig("action", e.target.value)}
                disabled={readOnly}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">Select action...</option>
                <option value="send_email">Send email</option>
                <option value="update_lead">Update lead</option>
                <option value="create_lead">Create lead</option>
                <option value="slack_notify">Slack notification</option>
                <option value="http_request">HTTP request</option>
              </select>
            </div>
          </div>
        );

      case "condition":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Field</label>
              <input
                value={config.field || ""}
                onChange={(e) => updateConfig("field", e.target.value)}
                placeholder="e.g. lead.stage"
                disabled={readOnly}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Operator</label>
              <select
                value={config.operator || "equals"}
                onChange={(e) => updateConfig("operator", e.target.value)}
                disabled={readOnly}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="equals">equals</option>
                <option value="not_equals">not equals</option>
                <option value="contains">contains</option>
                <option value="greater_than">greater than</option>
                <option value="less_than">less than</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Value</label>
              <input
                value={config.value || ""}
                onChange={(e) => updateConfig("value", e.target.value)}
                placeholder="e.g. qualified"
                disabled={readOnly}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>
        );

      case "delay":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Duration</label>
              <input
                type="number"
                min="1"
                value={config.duration || ""}
                onChange={(e) => updateConfig("duration", e.target.value)}
                placeholder="5"
                disabled={readOnly}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Unit</label>
              <select
                value={config.unit || "minutes"}
                onChange={(e) => updateConfig("unit", e.target.value)}
                disabled={readOnly}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-72 border-l bg-white flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold text-gray-800">{readOnly ? "Node Details" : "Configure Node"}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-600">Label</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => onUpdate(node.id, { label })}
            disabled={readOnly}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>
        {renderConfigFields()}
      </div>
      {!readOnly && (
        <div className="border-t p-3">
          <button
            onClick={() => {
              const parsedConfig: Record<string, unknown> = {};
              for (const [k, v] of Object.entries(config)) {
                parsedConfig[k] = v;
              }
              onUpdate(node.id, { label, config: parsedConfig });
            }}
            className="w-full rounded bg-blue-600 text-white text-sm font-medium py-2 hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
