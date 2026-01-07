import type { FC, ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  children?: ReactNode;
};

const PageHeader: FC<PageHeaderProps> = ({ title, children }) => {
  return (
    <div className="flex items-center justify-between mb-6 gap-4">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex-shrink-0">{title}</h1>
      <div className="flex items-center space-x-4 w-full justify-end">
        {children}
      </div>
    </div>
  );
};

export default PageHeader;
