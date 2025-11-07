import React, { FC } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { DocumentAttachment } from '@/lib/types/attachment';
import { formatFileSize, getFileTypeInfo } from '@/lib/utils/fileTypes';
import { cn } from '@/lib/utils';

interface DocumentAttachmentCardProps {
  attachment: DocumentAttachment;
  onRemove: () => void;
  onDownload?: () => void;
  showTokenCount?: boolean;
  className?: string;
}

export const DocumentAttachmentCard: FC<DocumentAttachmentCardProps> = ({
  attachment,
  onRemove,
  onDownload,
  showTokenCount = true,
  className,
}) => {
  const fileTypeInfo = getFileTypeInfo(attachment.mime_type);
  const icon = fileTypeInfo?.icon || '📎';

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors',
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-2xl flex-shrink-0">{icon}</div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate" title={attachment.file_name}>
            {attachment.file_name}
          </div>

          <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
            <span>{formatFileSize(attachment.file_size)}</span>

            {showTokenCount && attachment.token_count && (
              <>
                <span>•</span>
                <span>{attachment.token_count.toLocaleString()} tokens</span>
              </>
            )}

            {attachment.metadata?.page_count && (
              <>
                <span>•</span>
                <span>{attachment.metadata.page_count} pages</span>
              </>
            )}

            {attachment.metadata?.row_count && (
              <>
                <span>•</span>
                <span>{attachment.metadata.row_count} rows</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 ml-2">
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-colors"
          title="Remove"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
