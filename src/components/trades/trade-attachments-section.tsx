/**
 * Trade Attachments & Evidence Section
 *
 * Production-grade gallery and upload workflow for trade screenshots and PDF proof.
 * Features:
 * - Attachment listing with thumbnails for images and doc cards for PDFs
 * - Drag & drop or click file uploader with size & MIME validation
 * - Upload progress / spinner state
 * - Delete confirmation dialog
 * - Safe view / download links
 * - Keyboard accessible and responsive down to mobile viewports (375px)
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Paperclip,
  Upload,
  Trash2,
  Eye,
  Download,
  AlertCircle,
  FileIcon,
  RefreshCw,
  X,
} from "@/components/icons";
import {
  fetchTradeAttachments,
  uploadTradeAttachment,
  deleteTradeAttachment,
  TradeClientApiError,
  type AttachmentClientDto,
} from "@/lib/client/trades";
import {
  MAX_ATTACHMENT_SIZE_BYTES,
  ALLOWED_ATTACHMENT_MIME_TYPES,
} from "@/lib/trading/attachment/types";

interface TradeAttachmentsSectionProps {
  readonly tradeId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  if (!date || isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function TradeAttachmentsSection({ tradeId }: TradeAttachmentsSectionProps) {
  const [attachments, setAttachments] = useState<ReadonlyArray<AttachmentClientDto>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Deletion modal state
  const [deletingAttachment, setDeletingAttachment] = useState<AttachmentClientDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Image preview modal state
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentClientDto | null>(null);

  // Drag over state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAttachments = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchTradeAttachments(tradeId);
      setAttachments(data);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof TradeClientApiError
          ? err.message
          : "Failed to load trade attachments.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [tradeId]);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await fetchTradeAttachments(tradeId);
        if (isMounted) {
          setAttachments(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(
            err instanceof TradeClientApiError
              ? err.message
              : "Failed to load trade attachments.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, [tradeId]);

  const handleFileProcess = async (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Client-side quick checks
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setErrorMessage(
        `File size exceeds limit of ${formatFileSize(MAX_ATTACHMENT_SIZE_BYTES)}. Selected file: ${formatFileSize(file.size)}.`,
      );
      return;
    }

    if (
      !ALLOWED_ATTACHMENT_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number],
      ) &&
      file.type !== ""
    ) {
      setErrorMessage(
        `Unsupported file type (${file.type || "unknown"}). Allowed formats: PNG, JPEG, WebP, PDF.`,
      );
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await uploadTradeAttachment(tradeId, file);
      setAttachments((prev) => [uploaded, ...prev]);
      setSuccessMessage(`Successfully uploaded "${file.name}"`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof TradeClientApiError
          ? err.message
          : "Failed to upload file. Please try again.",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const confirmDelete = async () => {
    if (!deletingAttachment) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteTradeAttachment(tradeId, deletingAttachment.id);
      setAttachments((prev) => prev.filter((a) => a.id !== deletingAttachment.id));
      setDeletingAttachment(null);
    } catch (err: unknown) {
      setDeleteError(
        err instanceof TradeClientApiError
          ? err.message
          : "Failed to delete attachment.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Paperclip size={18} className="text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Trade Attachments &amp; Evidence
          </h2>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {attachments.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            id="trade-attachment-upload-input"
            aria-label="Upload trade evidence attachment"
            className="hidden"
            accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isUploading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            <span>{isUploading ? "Uploading..." : "Upload Evidence"}</span>
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-xs text-rose-300 flex items-center justify-between gap-2"
        >
          <div className="flex items-start gap-2 flex-1">
            <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAttachments}
              className="inline-flex items-center gap-1 rounded bg-rose-900/50 hover:bg-rose-900 px-2 py-1 text-[11px] font-medium text-rose-200"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-3 text-xs text-emerald-300 flex items-center justify-between"
        >
          <span>{successMessage}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-emerald-200"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={[
          "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500",
          isDraggingOver
            ? "border-emerald-500 bg-emerald-950/20"
            : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60",
        ].join(" ")}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        aria-label="Drag and drop or click to upload evidence"
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="h-10 w-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
            {isUploading ? (
              <RefreshCw size={20} className="animate-spin text-emerald-400" />
            ) : (
              <Upload size={20} className="text-emerald-400" />
            )}
          </div>
          <div className="text-xs">
            <span className="font-semibold text-slate-200">
              Click to upload or drag &amp; drop
            </span>
            <span className="text-slate-400 block mt-0.5">
              PNG, JPG, WebP, or PDF (max 10MB)
            </span>
          </div>
        </div>
      </div>

      {/* Gallery / Attachment List */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-xl bg-slate-950/60 border border-slate-800/80"
            />
          ))}
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-8 rounded-xl border border-slate-800/60 bg-slate-950/20">
          <p className="text-xs text-slate-500">
            No chart screenshots or trade evidence attached yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {attachments.map((att) => {
            const isImage = att.mimeType.startsWith("image/");
            const isPdf = att.mimeType === "application/pdf";
            const downloadUrl = `/api/trades/${encodeURIComponent(tradeId)}/attachments/${encodeURIComponent(att.id)}/download`;

            return (
              <div
                key={att.id}
                className="group relative rounded-xl border border-slate-800 bg-slate-950/80 p-3 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm overflow-hidden"
              >
                {/* Visual Thumbnail or Document Icon */}
                <div className="relative h-32 w-full rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center mb-3 border border-slate-800/60">
                  {isImage ? (
                    // Next/Image is not configured for dynamic local streams, use standard img
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={downloadUrl}
                      alt={att.fileName}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200 cursor-pointer"
                      onClick={() => setPreviewAttachment(att)}
                      loading="lazy"
                    />
                  ) : isPdf ? (
                    <div
                      className="flex flex-col items-center justify-center gap-1 cursor-pointer p-2"
                      onClick={() => window.open(downloadUrl, "_blank", "noopener,noreferrer")}
                    >
                      <FileIcon size={32} className="text-rose-400" />
                      <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wide">
                        PDF Document
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1">
                      <FileIcon size={32} className="text-slate-400" />
                      <span className="text-[10px] text-slate-400 uppercase">
                        {att.mimeType}
                      </span>
                    </div>
                  )}

                  {/* Hover Overlay with Action Buttons */}
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 pointer-events-none group-hover:pointer-events-auto">
                    {isImage ? (
                      <button
                        type="button"
                        onClick={() => setPreviewAttachment(att)}
                        aria-label={`Preview ${att.fileName}`}
                        className="p-2 rounded-lg bg-slate-900/90 text-slate-200 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                    ) : (
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View ${att.fileName}`}
                        className="p-2 rounded-lg bg-slate-900/90 text-slate-200 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors"
                      >
                        <Eye size={16} />
                      </a>
                    )}

                    <a
                      href={downloadUrl}
                      download={att.fileName}
                      aria-label={`Download ${att.fileName}`}
                      className="p-2 rounded-lg bg-slate-900/90 text-slate-200 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors"
                    >
                      <Download size={16} />
                    </a>

                    <button
                      type="button"
                      onClick={() => setDeletingAttachment(att)}
                      aria-label={`Delete ${att.fileName}`}
                      className="p-2 rounded-lg bg-rose-950/90 text-rose-300 hover:text-white hover:bg-rose-900 border border-rose-800 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* File Metadata */}
                <div className="space-y-1">
                  <span
                    className="text-xs font-semibold text-slate-200 block truncate"
                    title={att.fileName}
                  >
                    {att.fileName}
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{formatFileSize(att.fileSize)}</span>
                    <span>{formatDate(att.uploadedAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAttachment && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-attachment-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-950/60 border border-rose-900/50 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3
                  id="delete-attachment-title"
                  className="text-sm font-bold text-slate-100"
                >
                  Delete Attachment
                </h3>
                <p className="text-xs text-slate-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-100 font-semibold">
                &quot;{deletingAttachment.fileName}&quot;
              </strong>{" "}
              from this trade record?
            </p>

            {deleteError && (
              <div
                role="alert"
                className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-2.5 text-xs text-rose-300"
              >
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingAttachment(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {isDeleting && <RefreshCw size={12} className="animate-spin" />}
                <span>{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewAttachment && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image preview modal"
          onClick={() => setPreviewAttachment(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md cursor-zoom-out"
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 text-slate-200">
              <span className="text-xs font-semibold truncate max-w-xs sm:max-w-md">
                {previewAttachment.fileName}
              </span>
              <button
                type="button"
                aria-label="Close preview"
                onClick={() => setPreviewAttachment(null)}
                className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              >
                <X size={16} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/trades/${encodeURIComponent(tradeId)}/attachments/${encodeURIComponent(previewAttachment.id)}/download`}
              alt={previewAttachment.fileName}
              className="max-h-[80vh] max-w-full rounded-xl border border-slate-800 object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
