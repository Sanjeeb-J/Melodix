import { X } from "lucide-react";

const EditModal = ({ isOpen, onClose, onSave, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-zinc-950 w-full max-w-lg rounded-3xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-2xl font-black">{title}</h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {children}
          <div className="flex space-x-4 pt-4">
            <button
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-3 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-all"
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