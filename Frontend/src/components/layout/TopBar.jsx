import React from 'react';
import { Save, Play, Terminal, LogOut } from 'lucide-react';
import { useMainframe } from '../../context/MainframeContext';
import { currentUser } from '../../data/mockData';

export const TopBar = () => {
  const { 
    activeTabId, 
    saveTab, 
    submitJob, 
    savingStatus,
    submissionStatus
  } = useMainframe();

  const handleSave = () => {
    if (activeTabId) {
      saveTab(activeTabId);
    }
  };

  const handleSubmit = () => {
    if (activeTabId) {
      submitJob(activeTabId);
    }
  };

  const renderSaveStatus = () => {
    if (!activeTabId) return null;
    
    const status = savingStatus[activeTabId];
    if (status === 'saving') {
      return <span className="text-blue-400">Saving...</span>;
    } else if (status === 'unsaved') {
      return <span className="text-amber-400">Unsaved</span>;
    } else {
      return <span className="text-green-400">Saved</span>;
    }
  };

  return (
    <div className="h-14 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 px-4 flex items-center justify-between shadow-md">
      <div className="flex items-center">
        <Terminal className="w-8 h-8 text-blue-400 mr-2" />
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          MainframeUI
        </span>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex text-sm">
          {renderSaveStatus()}
        </div>
        
        <button 
          onClick={handleSave}
          disabled={!activeTabId}
          className={`p-2 rounded-md flex items-center ${
            !activeTabId 
              ? 'opacity-50 cursor-not-allowed bg-slate-700'
              : 'bg-slate-700 hover:bg-slate-600 transition-colors'
          }`}
          title="Save (Ctrl+S)"
        >
          <Save className="w-4 h-4 mr-1" />
          <span>Save</span>
        </button>
        
        <button 
          onClick={handleSubmit}
          disabled={!activeTabId || submissionStatus === 'submitting'}
          className={`p-2 rounded-md flex items-center ${
            !activeTabId || submissionStatus === 'submitting'
              ? 'opacity-50 cursor-not-allowed bg-slate-700'
              : 'bg-blue-600 hover:bg-blue-500 transition-colors'
          }`}
          title="Submit Job (Ctrl+Enter)"
        >
          <Play className="w-4 h-4 mr-1" />
          <span>{submissionStatus === 'submitting' ? 'Submitting...' : 'Submit'}</span>
        </button>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="flex items-center bg-slate-700 rounded-full px-3 py-1">
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-2">
            {currentUser.username.charAt(0)}
          </div>
          <span className="text-sm">{currentUser.username}</span>
        </div>
        
        <button className="p-2 rounded-md hover:bg-slate-700 transition-colors" title="Logout">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};