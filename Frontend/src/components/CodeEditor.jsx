import React, { useState } from 'react';
import { FiFile, FiFolder, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import MonacoEditor from '@monaco-editor/react';

const CodeEditor = ({ files, onFileChange }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});

  const toggleFolder = (path) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const renderFileTree = (items, path = '') => {
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
    <div className="flex h-screen bg-white">
      {/* File Tree Sidebar */}
      <div className="w-64 border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">z/OS Files</h2>
          {renderFileTree(files)}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            <div className="border-b border-gray-200 p-2 bg-gray-50">
              <span className="text-sm text-gray-600">{selectedFile}</span>
            </div>
            <div className="flex-1">
              <MonacoEditor
                height="100%"
                language="cobol"
                theme="vs-dark"
                value={files.find(f => f.path === selectedFile)?.content || ''}
                onChange={(value) => onFileChange(selectedFile, value)}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a file to edit
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor; 