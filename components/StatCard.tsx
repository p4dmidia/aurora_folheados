import React from 'react';

interface StatCardProps {
    label: string;
    value: string | number;
    trend?: {
        value: string;
        type: 'up' | 'down' | 'warning';
    };
    subtitle?: string;
    progress?: number;
    icon?: string;
    className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    trend,
    subtitle,
    progress,
    icon,
    className = ''
}) => {
    return (
        <div className={`bg-white dark:bg-white/5 p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-full text-brand-dark dark:text-white ${className}`}>
            {icon && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12"></div>
            )}

            <div>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</span>
                    {icon && <span className="material-symbols-outlined text-primary/40">{icon}</span>}
                </div>

                <div className="flex items-baseline gap-2">
                    <p className="text-2xl md:text-3xl font-black leading-none">{value}</p>
                </div>

                {subtitle && <p className="text-xs text-gray-400 mt-1 font-medium">{subtitle}</p>}
            </div>

            {trend && (
                <div className={`flex items-center gap-1 text-sm font-bold mt-4 ${trend.type === 'up' ? 'text-emerald-600' :
                    trend.type === 'down' ? 'text-rose-600' : 'text-amber-600'
                    }`}>
                    <span className="material-symbols-outlined text-sm">
                        {trend.type === 'up' ? 'trending_up' :
                            trend.type === 'down' ? 'trending_down' : 'warning'}
                    </span>
                    <span>{trend.value}</span>
                </div>
            )}

            {progress !== undefined && (
                <div className="mt-4">
                    <div className="w-full bg-gray-100 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatCard;
