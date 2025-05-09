import React from 'react';
import { Editor } from '@monaco-editor/react';
import { Tabs } from '../ui/Tabs';
import { X } from 'lucide-react';
import { useMainframe } from '../../context/MainframeContext';

export const EditorArea = () => {
  const { 
    openTabs, 
    activeTabId, 
    setActiveTab, 
    closeTab, 
    updateTabContent 
  } = useMainframe();

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (activeTabId) {
          saveTab(activeTabId);
        }
      }
      
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (activeTabId) {
          submitJob(activeTabId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTabId]);

  const { saveTab, submitJob } = useMainframe();

  const getLanguageForMonaco = (language) => {
    const languageMap = {
      'jcl': 'plaintext',
      'cobol': 'cobol',
      'rexx': 'plaintext',
      'data': 'plaintext'
    };
    
    return languageMap[language.toLowerCase()] || 'plaintext';
  };

  const activeTab = openTabs.find(tab => tab.id === activeTabId);


  const handleJobSubmit = async () => {
    const res = await fetch(`${API_BASE}/jobs/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }) // You'll need to structure this on backend
    });
    const data = await res.json();
    setJobId(data.job_id);
  };

  
  return (
    <div className="h-full flex flex-col bg-slate-900">
      {openTabs.length > 0 ? (
        <>
          <Tabs 
            tabs={openTabs.map(tab => ({ 
              id: tab.id, 
              label: tab.name,
              icon: <span className="text-xs opacity-70 mr-1">{tab.path.split('.').pop()}</span>
            }))} 
            activeTab={activeTabId || ''} 
            onTabChange={setActiveTab}
            onTabClose={closeTab}
            closable={true}
          />
          
          <div className="flex-1 overflow-hidden">
            {activeTab && (
              <Editor
                height="100%"
                defaultLanguage={getLanguageForMonaco(activeTab.language)}
                value={activeTab.content}
                onChange={(value) => value && updateTabContent(activeTab.id, value)}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  fontFamily: 'IBM Plex Mono, monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on'
                }}
              />
            )}
          </div>
        </>
      ) : (
        <div className="h-full flex items-center justify-center bg-slate-800 text-gray-400">
          <div className="text-center">
            <p className="mb-2">No files open</p>
            <p className="text-sm">Select a dataset member from the explorer</p>
          </div>
        </div>
      )}
    </div>
  );
};