import React from 'react';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
    label: string;
    variant?: StatusVariant;
    className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ label, variant = 'neutral', className = '' }) => {
    const variants = {
        success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
        warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
        danger: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
        info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
        neutral: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-400',
    };

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${variants[variant]} ${className}`}>
            {label}
        </span>
    );
};

export default StatusBadge;
