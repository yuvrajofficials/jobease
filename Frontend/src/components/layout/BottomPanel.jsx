import React, { useState } from 'react';
import { Tabs } from '../ui/Tabs';
import { JobOutputViewer } from '../output/JobOutputViewer';
import { AIAssistant } from '../ai/AIAssistant';
import { Terminal, MessageSquare } from 'lucide-react';

export const BottomPanel = () => {
  const [activeTab, setActiveTab] = useState('output');
  
  const tabs = [
    { 
      id: 'output', 
      label: 'Job Output', 
      icon: <Terminal className="w-4 h-4 mr-1" /> 
    },
    { 
      id: 'assistant', 
      label: 'AI Assistant', 
      icon: <MessageSquare className="w-4 h-4 mr-1" /> 
    }
  ];

  return (
    <div className="h-full flex flex-col border-t border-slate-700 bg-slate-800">
      <Tabs 
        tabs={tabs} 
        activeTab={activeTab} 
        onTabChange={(tab) => setActiveTab(tab)} 
      />
      
      <div className="flex-1 overflow-hidden">
        {activeTab === 'output' ? (
          <JobOutputViewer />
        ) : (
          <AIAssistant />
        )}
      </div>
    </div>
  );
};