import React, { FC } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { ValidationResponse } from '@/lib/types/attachment';
import { formatFileSize } from '@/lib/utils/fileTypes';

interface ValidationErrorModalProps {
  open: boolean;
  onClose: () => void;
  validation: ValidationResponse | null;
  fileName: string;
  fileSize: number;
  onViewAttachments?: () => void;
  onChangeModel?: () => void;
}

export const ValidationErrorModal: FC<ValidationErrorModalProps> = ({
  open,
  onClose,
  validation,
  fileName,
  fileSize,
  onViewAttachments,
  onChangeModel,
}) => {
  if (!validation || validation.can_upload) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Cannot Upload Document
          </DialogTitle>
          <DialogDescription>
            This file would exceed your model&apos;s context window.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto min-h-0">
          {/* File Info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between gap-2 min-w-0">
              <span className="font-medium flex-shrink-0">File:</span>
              <span className="text-right truncate min-w-0" title={fileName}>
                {fileName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Size:</span>
              <span>{formatFileSize(fileSize)}</span>
            </div>
          </div>

          {/* Token Usage */}
          <div className="bg-red-50 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">Estimated tokens:</span>
              <span className="font-mono">
                {validation.estimated_tokens.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Current usage:</span>
              <span className="font-mono">
                {validation.current_context_usage.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Model limit:</span>
              <span className="font-mono">
                {validation.model_context_limit.toLocaleString()}
              </span>
            </div>
            <div className="border-t border-red-200 pt-2 mt-2">
              <div className="flex justify-between text-red-700 font-semibold">
                <span>Exceeds by:</span>
                <span>
                  {validation.excess_tokens?.toLocaleString()} tokens (
                  {validation.excess_percentage?.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <div>
            <p className="font-medium text-sm mb-2">Suggestions:</p>
            <ul className="space-y-1 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Remove some existing attachments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>
                  Switch to a model with larger context (e.g., Gemini 2.5 Pro - 2M
                  tokens)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Upload a smaller document</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {onViewAttachments && (
            <Button variant="outline" onClick={onViewAttachments}>
              View Attachments
            </Button>
          )}
          {onChangeModel && (
            <Button onClick={onChangeModel}>Change Model</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
