"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, X } from "lucide-react";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleClose = useCallback(() => {
    if (!isDeleting) {
      setConfirmText("");
      setError("");
      onClose();
    }
  }, [isDeleting, onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isDeleting, handleClose]);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      setError('Please type "DELETE" to confirm');
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await onConfirm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-dark-900 rounded-xl p-6 max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-dark-900 dark:text-dark-50">
              Delete Account
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning Message */}
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-300 font-medium mb-2">
            ⚠️ This action cannot be undone
          </p>
          <p className="text-sm text-red-700 dark:text-red-400">
            Deleting your account will permanently remove:
          </p>
          <ul className="mt-2 text-sm text-red-700 dark:text-red-400 space-y-1 ml-4 list-disc">
            <li>Your profile and account information</li>
            <li>All your listings and drafts</li>
            <li>Analytics and performance data</li>
            <li>Marketplace connections</li>
            <li>AI generation history</li>
            <li>Support tickets and messages</li>
          </ul>
        </div>

        {/* Confirmation Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
            Type <span className="font-bold text-red-600">DELETE</span> to
            confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
              setError("");
            }}
            placeholder="DELETE"
            disabled={isDeleting}
            className="w-full px-4 py-2 rounded-lg border border-dark-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 border border-dark-300 dark:border-dark-700 text-dark-700 dark:text-dark-300 font-medium rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== "DELETE"}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
