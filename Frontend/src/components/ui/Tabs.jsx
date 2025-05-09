import React from 'react';
import clsx from 'clsx';

export const Tabs = ({ 
  tabs, 
  activeTab, 
  onTabChange, 
  onTabClose,
  closable = false
}) => {
  return (
    <div className="flex border-b border-slate-700 bg-slate-900">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={clsx(
            'flex items-center px-4 py-2 text-sm focus:outline-none transition-colors relative',
            activeTab === tab.id 
              ? 'text-blue-400 bg-slate-800 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800'
          )}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon}
          {tab.label}
          
          {closable && onTabClose && (
            <span
              className="ml-2 hover:bg-slate-700 rounded-full p-1"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
            >
              ×
            </span>
          )}
        </button>
      ))}
    </div>
  );
};