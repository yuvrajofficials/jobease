import React, { useState, useEffect } from 'react';

import MonacoEditor from '@monaco-editor/react';
import { useMainframe } from '../context/MainframeContext';
import { AIAssistant } from './ai/AIAssistant';
import {
  FiFile, FiFolder, FiChevronRight, FiChevronDown, FiCode, FiTerminal,
  FiSettings, FiDatabase, FiServer, FiHardDrive, FiRefreshCw,
  FiX, FiMaximize2, FiMinimize2, FiSave, FiPlay, FiBook,
  FiHelpCircle, FiMoon, FiSun
} from 'react-icons/fi';
const EditorDashboard = () => {
  const { datasets, jobs, loading, error, fetchDatasets, fetchJobs } = useMainframe();
  const [files, setFiles] = useState([]);
   const [expandedFolders, setExpandedFolders] = useState({});
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState(null);
const [selectedJob, setSelectedJob] = useState(null);
  const [datasetMembers, setDatasetMembers] = useState([]);
const [chatHistory, setChatHistory] = useState([]);
const [currentFile, setCurrentFile] = useState(null);


  const [darkMode, setDarkMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [activeTab, setActiveTab] = useState('datasets');
  const [activeRightTab, setActiveRightTab] = useState('chat');
  const [fileContent, setFileContent] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeStatus, setExecuteStatus] = useState(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [fileError, setFileError] = useState(null);

  useEffect(() => {
    fetchAnalysis();
  }, []);

  useEffect(() => {
    if (selectedDataset) {
      fetchDatasetMembers(selectedDataset);
    }
  }, [selectedDataset]);

 const fetchDatasetMembers = async (datasetName) => {
  const credRaw = localStorage.getItem('credentials');
  const cred = credRaw ? JSON.parse(credRaw) : null;

  console.log('Parsed credentials:', cred);

  if (!cred) {
    console.error('No credentials found in localStorage');
    return;
  }

  try {
    const response = await fetch(`http://localhost:8000/api/datasets/${datasetName}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        host: cred.host,
        port: cred.port,
        username: cred.username,
        password: cred.password
      })
    });

    if (response.ok) {
      const data = await response.json();
      setDatasetMembers(data.members || []);
    } else {
      const errorText = await response.text();
      console.error('Failed to fetch dataset members:', errorText);
    }
  } catch (error) {
    console.error('Error fetching dataset members:', error);
  }
};

 const fetchFileContent = async (dataset, member) => {
  const credRaw = localStorage.getItem('credentials');
  const cred = credRaw ? JSON.parse(credRaw) : null;

  console.log('Fetching file content:', { dataset, member, cred });

  if (!cred) {
    console.error('Missing credentials');
    setFileError('Missing credentials');
    return;
  }

  try {
    setIsLoadingContent(true);
    setFileError(null);

    const response = await fetch(`http://localhost:8000/api/datasets/${dataset}/members/${member}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        host: cred.host,
        port: cred.port,
        username: cred.username,
        password: cred.password
      }),
      credentials: 'include'
    });

    console.log('Response status:', response.status);

    const data = await response.json();
    console.log('Response data:', data);

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch file content');
    }

    if (!data.content) {
      throw new Error('No content found in response');
    }

    setFileContent(data.content);
    setCurrentFile({ dataset, member });
    setActiveTab('datasets');
    setFileError(null);
  } catch (err) {
    console.error('Error fetching file content:', err);
    setFileError(err.message || 'Failed to fetch file content');
    setFileContent('');
    setCurrentFile(null);
  } finally {
    setIsLoadingContent(false);
  }
};


  const handleFileSelect = async (datasetName, memberName) => {
    setSelectedDataset(datasetName);
    setSelectedFile(memberName);
    
    // Check if we already have the file content
    const existingFile = files.find(f => f.path === memberName);
    if (!existingFile) {
      await fetchFileContent(datasetName, memberName);
    } else {
      setFileContent(existingFile.content);
    }
  };

  const handleSave = async () => {
  if (!selectedFile || !selectedDataset) return;

  setIsSaving(true);
  setSaveStatus(null);

  const credRaw = localStorage.getItem('credentials');
  const cred = credRaw ? JSON.parse(credRaw) : null;

  if (!cred) {
    console.error('Missing credentials');
    setSaveStatus('error');
    return;
  }

  try {
    const requestBody = {
      content: fileContent,
      credentials: {
        host: cred.host,
        port: cred.port,
        username: cred.username,
        password: cred.password
      }
    };

    console.log('Saving file with data:', {
      dataset: selectedDataset,
      member: selectedFile,
      contentLength: fileContent.length
    });

    const response = await fetch(`http://localhost:8000/api/datasets/${selectedDataset}/members/${selectedFile}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.detail || 'Failed to save file');
    }

    setSaveStatus('success');
    setFiles(prev => prev.map(f =>
      f.path === selectedFile ? { ...f, content: fileContent } : f
    ));
  } catch (error) {
    console.error('Error saving file:', error);
    setSaveStatus('error');
  } finally {
    setIsSaving(false);
    setTimeout(() => setSaveStatus(null), 3000);
  }
};


  const handleExecute = async () => {
    if (!selectedFile || !selectedDataset) return;
    
    setIsExecuting(true);
    setExecuteStatus(null);
    try {
      const response = await fetch(`http://localhost:8000/api/datasets/${selectedDataset}/members/${selectedFile}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          host: localStorage.getItem('host'),
          port: localStorage.getItem('port'),
          username: localStorage.getItem('username'),
          password: localStorage.getItem('password')
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute job');
      }
      
      const result = await response.json();
      setExecuteStatus('success');
      // You might want to show the job ID and name in the UI
      console.log('Job submitted:', result);
    } catch (error) {
      console.error('Error executing job:', error);
      setExecuteStatus('error');
    } finally {
      setIsExecuting(false);
      // Clear status after 3 seconds
      setTimeout(() => setExecuteStatus(null), 3000);
    }
  };

  const fetchAnalysis = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/ai/analyze', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
    }
  };

  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:8000/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate code');
      }

      const data = await response.json();
      setFiles(data.files || []);
      setPrompt('');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleFolder = (path) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  return (
    <div className={`${darkMode ? 'dark' : ''}`}>
      <div className="flex max-h-full bg-white text-gray-900 dark:bg-[#1e1e1e] dark:text-gray-200 transition-colors duration-300 font-sans">
        {/* Sidebar */}
        <div className={`w-72 bg-gray-100 dark:bg-[#252526] border-r border-gray-200 dark:border-[#333] transition-all duration-300 ${isFullscreen ? '-translate-x-full' : 'translate-x-0'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-[#333] flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">zCraft: Agentic Editor</h2>
            <button onClick={() => setDarkMode(!darkMode)} className="text-gray-500 dark:text-gray-300 hover:text-blue-500">
              {darkMode ? <FiSun /> : <FiMoon />}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-[#333]">
            {['datasets', 'jobs', 'uss'].map(tab => (
              <button
                key={tab}
                className={`flex-1 p-3 text-center text-sm font-medium transition-all duration-200 ${activeTab === tab
                  ? 'bg-blue-100 dark:bg-[#37373d] text-blue-700 dark:text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-blue-500'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'datasets' && <FiDatabase className="inline-block mr-2" />}
                {tab === 'jobs' && <FiServer className="inline-block mr-2" />}
                {tab === 'uss' && <FiHardDrive className="inline-block mr-2" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Placeholder Dataset List */}
          <div className="p-4 text-gray-500 dark:text-gray-400 text-sm">
          

            {/* Dataset Tree */}
        <div className="p-4 overflow-y-auto h-[calc(100vh-120px)]">
          {activeTab === 'datasets' && (
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <FiRefreshCw className="animate-spin text-blue-400 text-2xl" />
                  <span className="ml-2 text-gray-400">Loading datasets...</span>
                </div>
              ) : error ? (
                <div className="text-red-400 p-4 bg-red-900/20 rounded">
                  Error: {error}
                </div>
              ) : !datasets || datasets.length === 0 ? (
                <div className="text-gray-400 p-4 text-center">
                  No datasets found. Try refreshing the list.
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Public Datasets */}
                  <div className="text-gray-400 text-sm font-medium mb-2">Public Datasets</div>
                  {datasets.filter(d => d.isPublic).map((dataset, index) => (
                    <div key={`public-${index}`} className="ml-2">
                      <div
                        className={`p-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                          selectedDataset === dataset.name 
                            ? 'bg-[#37373d] text-blue-400' 
                            : 'hover:bg-[#2a2d2e] text-gray-300'
                        }`}
                        onClick={() => setSelectedDataset(dataset.name)}
                      >
                        <div className="flex items-center">
                          <FiDatabase className="mr-2 text-blue-400" />
                          <span className="truncate">{dataset.name}</span>
                        </div>
                      </div>
                      {selectedDataset === dataset.name && datasetMembers.length > 0 && (
                        <div className="ml-4 mt-1 space-y-1">
                          {datasetMembers.map((member, idx) => (
                            <div
                              key={idx}
                              className={`p-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                                selectedFile === member.name 
                                  ? 'bg-[#37373d] text-blue-400' 
                                  : 'hover:bg-[#2a2d2e] text-gray-300'
                              }`}
                              onClick={() => handleFileSelect(dataset.name, member.name)}
                            >
                              <div className="flex items-center">
                                <FiFile className="mr-2 text-blue-400" />
                                <span>{member.name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* User Datasets */}
                  <div className="text-gray-400 text-sm font-medium mb-2 mt-4">Your Datasets</div>
                  {datasets.filter(d => !d.isPublic).map((dataset, index) => (
                    <div key={`user-${index}`} className="ml-2">
                      <div
                        className={`p-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                          selectedDataset === dataset.name 
                            ? 'bg-[#37373d] text-blue-400' 
                            : 'hover:bg-[#2a2d2e] text-gray-300'
                        }`}
                        onClick={() => setSelectedDataset(dataset.name)}
                      >
                        <div className="flex items-center">
                          <FiDatabase className="mr-2 text-blue-400" />
                          <span className="truncate">{dataset.name}</span>
                        </div>
                      </div>
                      {selectedDataset === dataset.name && datasetMembers.length > 0 && (
                        <div className="ml-4 mt-1 space-y-1">
                          {datasetMembers.map((member, idx) => (
                            <div
                              key={idx}
                              className={`p-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                                selectedFile === member.name 
                                  ? 'bg-[#37373d] text-blue-400' 
                                  : 'hover:bg-[#2a2d2e] text-gray-300'
                              }`}
                              onClick={() => handleFileSelect(dataset.name, member.name)}
                            >
                              <div className="flex items-center">
                                <FiFile className="mr-2 text-blue-400" />
                                <span>{member.name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <FiRefreshCw className="animate-spin text-blue-400 text-2xl" />
                  <span className="ml-2 text-gray-400">Loading jobs...</span>
                </div>
              ) : error ? (
                <div className="text-red-400 p-4 bg-red-900/20 rounded">
                  Error: {error}
                </div>
              ) : !jobs || jobs.length === 0 ? (
                <div className="text-gray-400 p-4 text-center">
                  No jobs found. Try refreshing the list.
                </div>
              ) : (
                jobs.map((job, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
                      selectedJob === job.jobId 
                        ? 'bg-[#37373d] text-blue-400' 
                        : 'hover:bg-[#2a2d2e] text-gray-300'
                    }`}
                    onClick={() => setSelectedJob(job.jobId)}
                  >
                    <div className="flex items-center">
                      <FiServer className="mr-3 text-blue-400" />
                      <div>
                        <div className="font-medium">{job.jobName}</div>
                        <div className="text-sm text-gray-400">ID: {job.jobId}</div>
                        <div className="text-sm text-gray-400">Status: {job.status}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'uss' && (
            <div className="text-gray-400 p-4 text-center">
              USS file system view coming soon...
            </div>
          )}
        </div>
      </div>
      
          </div>
        

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="h-12 bg-gray-100 dark:bg-[#252526] border-b border-gray-200 dark:border-[#333] flex items-center justify-between px-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-gray-500 dark:text-gray-400 hover:text-blue-500"
              >
                {isFullscreen ? <FiMaximize2 /> : <FiMinimize2 />}
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedFile ? `${selectedDataset}(${selectedFile})` : 'No file selected'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button className="text-gray-500 dark:text-gray-400 hover:text-green-400 disabled:opacity-50">
                <FiSave />
              </button>
              <button className="text-gray-500 dark:text-gray-400 hover:text-blue-400 disabled:opacity-50">
                <FiPlay />
              </button>
              <button className="text-gray-500 dark:text-gray-400 hover:text-purple-400">
                <FiSettings />
              </button>
              <button className="text-gray-500 dark:text-gray-400 hover:text-pink-400">
                <FiTerminal />
              </button>
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1 w-full bg-white dark:bg-[#1e1e1e]">
            {isLoadingContent ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <FiRefreshCw className="animate-spin mr-2" />
                Loading...
              </div>
            ) : fileError ? (
              <div className="flex items-center justify-center h-full text-red-500">
                {fileError}
              </div>
            ) : (
              <MonacoEditor
                height="100%"
                theme={darkMode ? "vs-dark" : "light"}
                defaultLanguage="jcl"
                value={fileContent}
                onChange={value => setFileContent(value)}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  fontLigatures: true,
                  wordWrap: "on",
                  fontFamily: "Fira Code, monospace"
                }}
              />
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-gray-100 dark:bg-[#252526] border-l border-gray-200 dark:border-[#333] flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-[#333]">
            {/* {['chat', 'learn'].map(tab => (
              <button
                key={tab}
                className={`flex-1 p-3 text-center text-sm transition-all duration-200 ${activeRightTab === tab
                  ? 'bg-blue-100 dark:bg-[#37373d] text-blue-700 dark:text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-blue-500'}`}
                onClick={() => setActiveRightTab(tab)}
              >
                {tab === 'chat' ? <FiHelpCircle className="inline-block mr-2" /> : <FiBook className="inline-block mr-2" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))} */}
          </div>
              <AIAssistant />

          
        </div>
      </div>
    </div>
  );
};

export default EditorDashboard; 