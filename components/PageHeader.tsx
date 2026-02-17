import React from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    extra?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, extra }) => {
    return (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
                <h2 className="text-3xl md:text-4xl font-black text-brand-dark dark:text-white tracking-tight">{title}</h2>
                {description && <p className="text-gray-500 text-sm md:text-lg mt-1">{description}</p>}
            </div>
            {(actions || extra) && (
                <div className="flex flex-wrap gap-2">
                    {actions}
                    {extra}
                </div>
            )}
        </header>
    );
};

export default PageHeader;
