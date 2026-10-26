"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, Trash2, HelpCircle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface UIFeedbackContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showConfirm: (options: ConfirmDialogOptions) => void;
}

const UIFeedbackContext = createContext<UIFeedbackContextValue | null>(null);

export function useUIFeedback() {
  const context = useContext(UIFeedbackContext);
  if (!context) {
    throw new Error("useUIFeedback must be used within a UIFeedbackProvider");
  }
  return context;
}

export function UIFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmDialogOptions | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  const showToast = useCallback((message: string, type: ToastType = "info", duration = 3800) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showConfirm = useCallback((options: ConfirmDialogOptions) => {
    setConfirmModal(options);
  }, []);

  const handleConfirmClose = () => {
    if (!isConfirmLoading) {
      setConfirmModal(null);
    }
  };

  const handleConfirmSubmit = async () => {
    if (!confirmModal) return;
    try {
      setIsConfirmLoading(true);
      await confirmModal.onConfirm();
      setConfirmModal(null);
    } finally {
      setIsConfirmLoading(false);
    }
  };

  // Close confirm on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && confirmModal && !isConfirmLoading) {
        setConfirmModal(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmModal, isConfirmLoading]);

  return (
    <UIFeedbackContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Toast Notification Container (Bottom-Right Floating) */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-center gap-3 p-3.5 sm:px-4 sm:py-3.5 rounded-2xl bg-[#0e0e14]/95 border border-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
            >
              <div className="shrink-0 flex items-center justify-center">
                {toast.type === "success" && (
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                {toast.type === "error" && (
                  <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                )}
                {toast.type === "warning" && (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                )}
                {toast.type === "info" && (
                  <div className="w-8 h-8 rounded-xl bg-[#ff7427]/15 border border-[#ff7427]/30 text-[#ff7427] flex items-center justify-center">
                    <Info className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="flex-1 text-xs sm:text-sm font-semibold text-white leading-snug">
                {toast.message}
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Premium Glassmorphic Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={handleConfirmClose}
          />

          {/* Dialog Container */}
          <div className="relative w-full max-w-md bg-[#12121b] border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-2xl z-10 transition-all transform animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-2xl border shrink-0 ${
                  confirmModal.isDanger
                    ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
                    : "bg-[#ff7427]/10 border-[#ff7427]/25 text-[#ff7427]"
                }`}
              >
                {confirmModal.isDanger ? (
                  <Trash2 className="w-5 h-5" />
                ) : (
                  <HelpCircle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {confirmModal.title}
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isConfirmLoading}
                onClick={handleConfirmClose}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {confirmModal.cancelText || "Cancel"}
              </button>
              <button
                type="button"
                disabled={isConfirmLoading}
                onClick={handleConfirmSubmit}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50 ${
                  confirmModal.isDanger
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/25"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25"
                }`}
              >
                {isConfirmLoading && (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>{confirmModal.confirmText || "Confirm"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </UIFeedbackContext.Provider>
  );
}
