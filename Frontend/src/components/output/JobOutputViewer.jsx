import React from 'react';
import { Tabs } from '../ui/Tabs';
import { useMainframe } from '../../context/MainframeContext';

export const JobOutputViewer = () => {
  const { 
    activeTabId, 
    jobOutputs, 
    activeOutputTab, 
    setActiveOutputTab 
  } = useMainframe();

  const jobOutput = activeTabId ? jobOutputs[activeTabId] : null;

  const outputTabs = [
    { id: 'JOBLOG', label: 'JOBLOG' },
    { id: 'SYSOUT', label: 'SYSOUT' },
    { id: 'SYSPRINT', label: 'SYSPRINT' }
  ];

  const renderStatusBadge = () => {
    if (!jobOutput) return null;
    
    const statusColors = {
      'COMPLETED': 'bg-green-500',
      'FAILED': 'bg-red-500',
      'RUNNING': 'bg-blue-500'
    };
    
    return (
      <span className={`${statusColors[jobOutput.status]} px-2 py-0.5 text-xs rounded-full`}>
        {jobOutput.status}
      </span>
    );
  };

  const formatOutput = (output) => {
    return output.split('\n').map((line, i) => (
      <div key={i} className="font-mono text-sm whitespace-pre">
        {line}
      </div>
    ));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-slate-700 bg-slate-900 flex items-center justify-between">
        <Tabs 
          tabs={outputTabs} 
          activeTab={activeOutputTab} 
          onTabChange={(tabId) => setActiveOutputTab(tabId)} 
        />
        
        {jobOutput && (
          <div className="flex items-center space-x-2 px-2 text-sm">
            <span className="text-gray-400">Job: {jobOutput.jobName}</span>
            <span className="text-gray-400">{jobOutput.jobId}</span>
            {renderStatusBadge()}
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-auto bg-slate-800 p-2">
        {jobOutput ? (
          formatOutput(jobOutput.outputs[activeOutputTab])
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <p>No job output available. Submit a job to see results here.</p>
          </div>
        )}
      </div>
    </div>
  );
};