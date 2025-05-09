import React, { useState, useEffect } from 'react';
import { FiFile, FiFolder, FiChevronRight, FiChevronDown, FiCode, FiTerminal, FiSettings, FiDatabase, FiServer, FiHardDrive, FiRefreshCw } from 'react-icons/fi';
import MonacoEditor from '@monaco-editor/react';
import { useMainframe } from '../context/MainframeContext';

const EditorDashboard = () => {
  const { datasets, jobs, loading, error, fetchDatasets, fetchJobs } = useMainframe();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState('datasets'); // 'datasets', 'jobs', 'uss'
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    fetchAnalysis();
  }, []);

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

  const renderDatasets = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <FiRefreshCw className="animate-spin text-blue-500 text-2xl" />
          <span className="ml-2">Loading datasets...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-red-500 p-4">
          Error: {error}
        </div>
      );
    }

    if (!datasets || datasets.length === 0) {
      return (
        <div className="text-gray-500 p-4">
          No datasets found. Try refreshing the list.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {datasets.map((dataset, index) => (
          <div
            key={index}
            className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
              selectedDataset === dataset.name ? 'bg-blue-50' : ''
            }`}
            onClick={() => setSelectedDataset(dataset.name)}
          >
            <div className="flex items-center">
              <FiDatabase className="mr-2" />
              <span>{dataset.name}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderJobs = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <FiRefreshCw className="animate-spin text-blue-500 text-2xl" />
          <span className="ml-2">Loading jobs...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-red-500 p-4">
          Error: {error}
        </div>
      );
    }

    if (!jobs || jobs.length === 0) {
      return (
        <div className="text-gray-500 p-4">
          No jobs found. Try refreshing the list.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {jobs.map((job, index) => (
          <div
            key={index}
            className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
              selectedJob === job.jobId ? 'bg-blue-50' : ''
            }`}
            onClick={() => setSelectedJob(job.jobId)}
          >
            <div className="flex items-center">
              <FiServer className="mr-2" />
              <div>
                <div className="font-medium">{job.jobName}</div>
                <div className="text-sm text-gray-500">ID: {job.jobId}</div>
                <div className="text-sm text-gray-500">Status: {job.status}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFileTree = (items = [], path = '') => {
    return items.map((item, index) => {
      const currentPath = path ? `${path}/${item.name}` : item.name;
      
      if (item.type === 'folder') {
        const isExpanded = expandedFolders[currentPath];
        return (
          <div key={currentPath} className="ml-4">
            <div
              className="flex items-center py-1 px-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => toggleFolder(currentPath)}
            >
              {isExpanded ? <FiChevronDown className="mr-1" /> : <FiChevronRight className="mr-1" />}
              <FiFolder className="mr-2 text-yellow-500" />
              <span>{item.name}</span>
            </div>
            {isExpanded && item.children && renderFileTree(item.children, currentPath)}
          </div>
        );
      }

      return (
        <div
          key={currentPath}
          className={`flex items-center py-1 px-2 ml-4 cursor-pointer ${
            selectedFile === currentPath ? 'bg-blue-100' : 'hover:bg-gray-100'
          }`}
          onClick={() => setSelectedFile(currentPath)}
        >
          <FiFile className="mr-2 text-blue-500" />
          <span>{item.name}</span>
        </div>
      );
    });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Mainframe Explorer</h2>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`flex-1 p-3 text-center ${
              activeTab === 'datasets' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('datasets')}
          >
            <FiDatabase className="inline-block mr-2" />
            Datasets
          </button>
          <button
            className={`flex-1 p-3 text-center ${
              activeTab === 'jobs' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('jobs')}
          >
            <FiServer className="inline-block mr-2" />
            Jobs
          </button>
          <button
            className={`flex-1 p-3 text-center ${
              activeTab === 'uss' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('uss')}
          >
            <FiHardDrive className="inline-block mr-2" />
            USS
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'datasets' && renderDatasets()}
          {activeTab === 'jobs' && renderJobs()}
          {activeTab === 'uss' && (
            <div className="text-gray-500">USS file system view coming soon...</div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {selectedDataset && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">Dataset: {selectedDataset}</h3>
            {/* Add dataset content viewer here */}
          </div>
        )}
        {selectedJob && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">Job: {selectedJob}</h3>
            {/* Add job details viewer here */}
          </div>
        )}
        {!selectedDataset && !selectedJob && (
          <div className="text-gray-500 text-center mt-8">
            Select a dataset or job to view its contents
          </div>
        )}
      </div>

      {/* AI Assistant Panel */}
      <div className="w-80 bg-white shadow-lg p-4">
        <h3 className="text-lg font-semibold mb-4">AI Assistant</h3>
        {analysis && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">System Analysis</h4>
              <p className="text-sm text-gray-600">{analysis.analysis}</p>
            </div>
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Recommendations</h4>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {analysis.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorDashboard; 