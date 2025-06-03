import React, { useEffect, useState } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmButtonColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmButtonColor = 'bg-red-600 hover:bg-red-700',
  onConfirm,
  onCancel
}) => {
  const [visible, setVisible] = useState(false);

  // Handle animation
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !visible) return null;

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel}></div>
      
      {/* Modal */}
      <div className={`bg-white rounded-xl shadow-2xl overflow-hidden w-[90%] max-w-md transition-all duration-300 transform ${isOpen ? 'scale-100' : 'scale-95'} border border-neutral-200`}>
        {/* Header */}
        <div className="bg-neutral-100 text-neutral-900 py-4 px-6 border-b border-neutral-200">
          <h2 className="text-xl font-bold text-center">{title}</h2>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <p className="text-neutral-700 text-center mb-6">{message}</p>
          
          {/* Action buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-md transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 ${confirmButtonColor} text-white rounded-md transition-colors`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal; 