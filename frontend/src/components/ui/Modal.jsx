import React from "react";

export default function Modal({ open, onClose, title, children, actions }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-gray-100 bg-white p-6 shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        {title ? <h3 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h3> : null}
        <div className="mt-4">{children}</div>
        {actions ? <div className="mt-6 flex justify-end gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
