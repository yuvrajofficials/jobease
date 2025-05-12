import React, { useState, useEffect } from 'react';
import { FiFile, FiFolder, FiChevronRight, FiChevronDown, FiCode, FiTerminal, FiSettings, FiDatabase, FiServer, FiHardDrive, FiRefreshCw, FiX, FiMaximize2, FiMinimize2, FiSave, FiPlay, FiBook, FiHelpCircle } from 'react-icons/fi';
import MonacoEditor from '@monaco-editor/react';
import { useMainframe } from '../context/MainframeContext';
import { AIAssistant } from './ai/AIAssistant';

const EditorDashboard = () => {
  const { datasets, jobs, loading, error, fetchDatasets, fetchJobs } = useMainframe();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState('datasets');
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [datasetMembers, setDatasetMembers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState('chat'); // 'chat' or 'learn'
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [fileContent, setFileContent] = useState('');
  const [currentFile, setCurrentFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [executeStatus, setExecuteStatus] = useState(null);

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
    setActiveTab('editor');
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
    <div className="flex h-screen bg-[#1e1e1e] text-gray-200">
      {/* Left Sidebar */}
      <div className={`w-72 bg-[#252526] border-r border-[#333] transition-all duration-300 ${isFullscreen ? '-translate-x-full' : 'translate-x-0'}`}>
        <div className="p-4 border-b border-[#333]">
          <h2 className="text-lg font-semibold text-white">zCraft: Agentic Editor</h2>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-[#333]">
          <button
            className={`flex-1 p-3 text-center transition-colors duration-200 ${
              activeTab === 'datasets' 
                ? 'bg-[#37373d] text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('datasets')}
          >
            <FiDatabase className="inline-block mr-2" />
            Datasets
          </button>
          <button
            className={`flex-1 p-3 text-center transition-colors duration-200 ${
              activeTab === 'jobs' 
                ? 'bg-[#37373d] text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('jobs')}
          >
            <FiServer className="inline-block mr-2" />
            Jobs
          </button>
          <button
            className={`flex-1 p-3 text-center transition-colors duration-200 ${
              activeTab === 'uss' 
                ? 'bg-[#37373d] text-blue-400 border-b-2 border-blue-400' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('uss')}
          >
            <FiHardDrive className="inline-block mr-2" />
            USS
          </button>
        </div>

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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Editor Header */}
        <div className="h-12 bg-[#252526] border-b border-[#333] flex items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-gray-400 hover:text-gray-200 transition-colors duration-200"
            >
              {isFullscreen ? <FiMaximize2 /> : <FiMinimize2 />}
            </button>
            <span className="text-gray-300">
              {selectedFile ? `${selectedDataset}(${selectedFile})` : 'No file selected'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              disabled={isSaving || !selectedFile}
              className={`p-2 text-gray-400 hover:text-gray-200 transition-colors duration-200 disabled:opacity-50 ${
                saveStatus === 'success' ? 'text-green-400' : saveStatus === 'error' ? 'text-red-400' : ''
              }`}
              title={saveStatus === 'success' ? 'Saved!' : saveStatus === 'error' ? 'Save failed' : 'Save'}
            >
              <FiSave />
            </button>
            <button
              onClick={handleExecute}
              disabled={isExecuting || !selectedFile}
              className={`p-2 text-gray-400 hover:text-gray-200 transition-colors duration-200 disabled:opacity-50 ${
                executeStatus === 'success' ? 'text-green-400' : executeStatus === 'error' ? 'text-red-400' : ''
              }`}
              title={executeStatus === 'success' ? 'Job submitted!' : executeStatus === 'error' ? 'Execution failed' : 'Execute'}
            >
              <FiPlay />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors duration-200">
              <FiSettings />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors duration-200">
              <FiTerminal />
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 bg-[#1e1e1e]">
          {isLoadingContent ? (
            <div className="flex items-center justify-center h-full">
              <FiRefreshCw className="animate-spin text-blue-400 text-2xl" />
              <span className="ml-2 text-gray-400">Loading file content...</span>
            </div>
          ) : fileError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-400 bg-red-900/20 p-4 rounded-lg">
                {fileError}
              </div>
            </div>
          ) : (
           <MonacoEditor
  height="100%"
  theme="vs-dark"
  defaultLanguage="jcl"
  value={fileContent}
  onChange={value => setFileContent(value)}
  options={{
    minimap: { enabled: false },
    fontSize: 15,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    fontLigatures: true,
    wordWrap: "on"
  }}
/>

          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-[#252526] border-l border-[#333] flex flex-col">
        {/* Right Sidebar Tabs */}
       

        {/* Chat Interface */}
        {activeRightTab === 'chat' && (
          <div className="flex-1 flex flex-col">
            <AIAssistant />
          </div>
        )}

     
      </div>
    </div>
  );
};

export default EditorDashboard; 