import { X } from "lucide-react";

const EditModal = ({ isOpen, onClose, onSave, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--card)] w-full max-w-lg rounded-3xl border border-[var(--border)] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-2xl font-black text-[var(--foreground)]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-2 rounded-lg hover:bg-[var(--accent)] transition-all"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {children}
          <div className="flex space-x-4 pt-4">
            <button
              onClick={onClose}
              className="flex-1 bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 text-[var(--secondary-foreground)] font-bold px-6 py-3 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="flex-1 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--primary-foreground)] font-bold px-6 py-3 rounded-xl transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
