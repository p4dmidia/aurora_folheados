import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'brand';
    size?: 'sm' | 'md' | 'lg';
    icon?: string;
    className?: string;
    loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    className = '',
    loading,
    disabled,
    fullWidth,
    ...props
}) => {
    const baseStyles = `inline-flex items-center justify-center gap-2 font-bold transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed ${fullWidth ? 'w-full' : ''}`;

    const variants = {
        primary: 'bg-primary text-white hover:brightness-110 shadow-lg shadow-primary/20',
        brand: 'bg-brand-dark text-white hover:bg-black shadow-lg shadow-brand-dark/10',
        secondary: 'bg-white dark:bg-white/5 text-brand-dark dark:text-white border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10',
        ghost: 'bg-transparent text-gray-500 hover:text-brand-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5',
        danger: 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100',
    };

    const sizes = {
        sm: 'px-4 py-2 text-xs',
        md: 'px-6 py-3 text-sm',
        lg: 'px-8 py-4 text-base uppercase tracking-widest',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            ) : icon && (
                <span className="material-symbols-outlined text-lg leading-none">{icon}</span>
            )}
            {children}
        </button>
    );
};

export default Button;
