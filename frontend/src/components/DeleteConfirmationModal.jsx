import React from 'react';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-stone-900">
        <h3 className="text-sm font-bold text-stone-900 mb-2">Delete Scheduled Post</h3>
        <p className="text-xs text-stone-500 mb-6">Are you sure you want to remove this post from the scheduling queue? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition duration-150 shadow-sm cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
