"use client";

import React from "react";
import { SpecOutput, SpecItem } from "@/lib/types/spec";
import { SharedMarkdown } from "@/components/chat/SharedMarkdown";
import { FileText, Package, ExternalLink, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SpecContentDisplayProps {
  specOutput: SpecOutput;
  recentlyChangedIds?: Set<string>;
}

const SpecItemCard: React.FC<{
  item: SpecItem;
  isRecentlyChanged?: boolean;
}> = ({ item, isRecentlyChanged }) => {
  return (
    <div
      className={cn(
        "border border-[#D3E5E5] rounded-lg p-4 space-y-3 transition-all",
        isRecentlyChanged && "ring-2 ring-yellow-400/50 bg-yellow-50"
      )}
    >
      {/* Title */}
      <h4 className="text-sm font-semibold text-primary-color">{item.title}</h4>

      {/* Files */}
      {item.files && item.files.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            Files
          </div>
          <div className="flex flex-wrap gap-1.5 pl-5">
            {item.files.map((file, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-xs border-[#D3E5E5] text-primary-color"
              >
                {file.path}
                {file.type && (
                  <span className="ml-1 text-muted-foreground">({file.type})</span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Dependencies */}
      {item.dependencies && item.dependencies.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Package className="w-3.5 h-3.5" />
            Dependencies
          </div>
          <div className="flex flex-wrap gap-1.5 pl-5">
            {item.dependencies.map((dep, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-xs bg-zinc-100 text-primary-color"
              >
                {dep}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* External Connections */}
      {item.externalConnections && item.externalConnections.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ExternalLink className="w-3.5 h-3.5" />
            External Connections
          </div>
          <div className="flex flex-wrap gap-1.5 pl-5">
            {item.externalConnections.map((conn, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-xs border-[#D3E5E5] text-primary-color"
              >
                {conn}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Details (Markdown) */}
      {item.details && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Details</div>
          <div className="pl-5 text-sm text-primary-color">
            <SharedMarkdown
              content={item.details}
              className="[&_p]:my-1 [&_p]:leading-relaxed [&_ul]:my-1 [&_ol]:my-1"
            />
          </div>
        </div>
      )}

      {/* Context */}
      {item.context && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Context</div>
          <div className="pl-5 text-sm text-muted-foreground">
            <SharedMarkdown
              content={item.context}
              className="[&_p]:my-1 [&_p]:leading-relaxed"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const SpecSection: React.FC<{
  title: string;
  items: SpecItem[];
  recentlyChangedIds?: Set<string>;
  emptyMessage?: string;
}> = ({ title, items, recentlyChangedIds, emptyMessage = "No items" }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-primary-color flex items-center gap-2">
        {title}
        <span className="text-sm font-normal text-muted-foreground">
          ({items.length})
        </span>
      </h3>
      <div className="space-y-3">
        {items.map((item) => (
          <SpecItemCard
            key={item.id}
            item={item}
            isRecentlyChanged={recentlyChangedIds?.has(item.id)}
          />
        ))}
      </div>
    </div>
  );
};

export const SpecContentDisplay: React.FC<SpecContentDisplayProps> = ({
  specOutput,
  recentlyChangedIds,
}) => {
  const hasContent =
    specOutput.add.length > 0 ||
    specOutput.modify.length > 0 ||
    specOutput.fix.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No spec content available</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8">
      <SpecSection
        title="Add"
        items={specOutput.add}
        recentlyChangedIds={recentlyChangedIds}
      />
      <SpecSection
        title="Modify"
        items={specOutput.modify}
        recentlyChangedIds={recentlyChangedIds}
      />
      <SpecSection
        title="Fix"
        items={specOutput.fix}
        recentlyChangedIds={recentlyChangedIds}
      />
    </div>
  );
};
