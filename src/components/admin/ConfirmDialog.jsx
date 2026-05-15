"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

/**
 * Confirm Dialog — destructive action confirmation modal
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {Function} props.onConfirm
 * @param {string} props.title
 * @param {string} props.message
 * @param {string} props.confirmText
 * @param {boolean} props.destructive - Red accent for delete actions
 * @param {boolean} props.loading
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Xác nhận",
  message = "Bạn có chắc chắn muốn thực hiện hành động này?",
  confirmText = "Xác nhận",
  destructive = false,
  loading = false,
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-4"
          >
            <div className="bg-surface-elevated rounded-2xl shadow-xl border border-border-color p-6">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>

              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                  destructive ? "bg-red-50 text-red-500" : "bg-orange-50 text-orange-500"
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{message}</p>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Huỷ
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50 ${
                    destructive
                      ? "bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/25"
                      : "bg-primary-500 hover:bg-primary-600 shadow-md shadow-primary-500/25"
                  }`}
                >
                  {loading ? "Đang xử lý..." : confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
