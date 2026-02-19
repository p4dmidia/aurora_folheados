
import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const bgColor = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500',
    }[type];

    const icon = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info',
    }[type];

    return (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 ${bgColor}`}>
            <span className="material-symbols-outlined">{icon}</span>
            <span className="text-sm font-bold">{message}</span>
            <button onClick={onClose} className="ml-2 hover:opacity-70">
                <span className="material-symbols-outlined text-sm">close</span>
            </button>
        </div>
    );
};

export default Toast;
