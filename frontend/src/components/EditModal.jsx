import { X } from "lucide-react";

const EditModal = ({ isOpen, onClose, onSave, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-main/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-sidebar w-full max-w-lg rounded-[2rem] border border-subtle shadow-premium overflow-hidden animate-zoom-in">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-2xl font-black">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-main p-2 rounded-xl hover:bg-card transition-all"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {children}
          <div className="flex space-x-4 pt-4">
            <button
              onClick={onClose}
              className="flex-1 bg-card hover:bg-card-hover text-main font-bold px-6 py-3.5 rounded-xl border border-subtle transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold px-6 py-3.5 rounded-xl shadow-lg transition-all"
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
