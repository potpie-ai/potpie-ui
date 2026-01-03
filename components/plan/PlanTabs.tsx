"use client";

import React, { useState } from "react";
import {
  FileCode,
  ChevronDown,
  Package,
  Link2,
  Info,
} from "lucide-react";

export interface PlanFile {
  path: string;
  type: "Create" | "Modify";
}

export interface PlanItem {
  id: string;
  title: string;
  details: string;
  files?: PlanFile[];
  dependencies?: string[];
  externalConnections?: string[];
  context?: string;
}

export interface Plan {
  add: PlanItem[];
  modify: PlanItem[];
  fix: PlanItem[];
}

interface PlanTabsProps {
  plan: Plan;
}

type TabId = "add" | "modify" | "fix";

interface Category {
  id: TabId;
  label: string;
  count: number;
}

export const PlanTabs: React.FC<PlanTabsProps> = ({ plan }) => {
  const [activeTab, setActiveTab] = useState<TabId>("add");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories: Category[] = [
    { id: "add", label: "Create", count: plan.add.length },
    { id: "modify", label: "Update", count: plan.modify.length },
    { id: "fix", label: "Fix", count: plan.fix.length },
  ];

  const handleToggleExpand = (itemId: string) => {
    setExpandedId(expandedId === itemId ? null : itemId);
  };

  const renderFileType = (type: string) => {
    return type === "Create" ? "text-emerald-500" : "text-blue-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-zinc-100">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`px-4 py-2 text-xs font-semibold transition-all relative ${
              activeTab === cat.id
                ? "text-zinc-900"
                : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            {cat.label} ({cat.count})
            {activeTab === cat.id && (
              <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-zinc-900" />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {plan[activeTab].map((item) => (
          <div
            key={item.id}
            className={`bg-white border transition-all rounded-lg overflow-hidden ${
              expandedId === item.id
                ? "border-zinc-300 shadow-sm"
                : "border-zinc-200 hover:border-zinc-300"
            }`}
          >
            {/* Summary Row */}
            <div
              onClick={() => handleToggleExpand(item.id)}
              className="p-4 flex justify-between items-start cursor-pointer select-none"
            >
              <div className="flex gap-3">
                <FileCode
                  className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    expandedId === item.id ? "text-zinc-900" : "text-zinc-400"
                  }`}
                />
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-medium text-zinc-900 font-sans">
                      {item.title}
                    </h4>
                    {item.files && item.files.length > 0 && (
                      <span className="text-xs font-medium px-1.5 py-0.5 bg-zinc-50 border border-zinc-100 rounded text-zinc-400 font-sans">
                        {item.files.length}{" "}
                        {item.files.length === 1 ? "File" : "Files"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed font-sans">
                    {item.details}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-300 transition-transform flex-shrink-0 mt-0.5 ${
                  expandedId === item.id ? "rotate-180" : ""
                }`}
              />
            </div>

            {/* Detailed Content */}
            {expandedId === item.id && (
              <div className="px-11 pb-5 pt-2 space-y-5 animate-in fade-in slide-in-from-top-1 duration-200 border-t border-zinc-50 font-sans">
                {item.files && item.files.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                      Target Files
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      {item.files.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-1 border-b border-zinc-50 last:border-0"
                        >
                          <code className="text-xs font-mono text-zinc-600">
                            {file.path}
                          </code>
                          <span
                            className={`text-xs font-medium uppercase ${renderFileType(
                              file.type
                            )}`}
                          >
                            {file.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(item.dependencies && item.dependencies.length > 0) ||
                (item.externalConnections &&
                  item.externalConnections.length > 0) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {item.dependencies && item.dependencies.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Package className="w-3 h-3" /> Libraries
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {item.dependencies.map((dep, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 bg-zinc-50 border border-zinc-100 rounded text-xs font-mono text-zinc-500"
                            >
                              {dep}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.externalConnections &&
                      item.externalConnections.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                            <Link2 className="w-3 h-3" /> External
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {item.externalConnections.map((conn, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-xs font-medium text-blue-600"
                              >
                                {conn}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                ) : null}

                {item.context && (
                  <div className="bg-zinc-50 rounded p-3 border-l-2 border-zinc-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Info className="w-3 h-3 text-zinc-400" />
                      <span className="text-xs font-medium text-zinc-400 uppercase">
                        Context
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 leading-relaxed italic">
                      {item.context}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

