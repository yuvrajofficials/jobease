import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode, Database } from 'lucide-react';
import { useMainframe } from '../../context/MainframeContext';

export const DatasetExplorer = () => {
  const { datasets, setActiveMember } = useMainframe();
  const [expandedDatasets, setExpandedDatasets] = useState(
    datasets.reduce((acc, dataset) => ({ ...acc, [dataset.id]: true }), {})
  );

  const toggleDataset = (datasetId) => {
    setExpandedDatasets(prev => ({
      ...prev,
      [datasetId]: !prev[datasetId]
    }));
  };

  const handleMemberClick = (member) => {
    setActiveMember(member);
  };

  const getFileIcon = () => {
    return <FileCode className="w-4 h-4 mr-1" />;
  };

  const groupMembersByType = (dataset) => {
    const groupedMembers = {};
    
    dataset.members.forEach(member => {
      const [, type] = member.dataset.split('.');
      if (!groupedMembers[type]) {
        groupedMembers[type] = [];
      }
      groupedMembers[type].push(member);
    });
    
    return Object.entries(groupedMembers).map(([type, members]) => ({
      type,
      members
    }));
  };

  return (
    <div className="h-full overflow-auto bg-slate-900 p-2">
      <div className="mb-2 p-2 font-semibold text-blue-400 flex items-center">
        <Database className="w-4 h-4 mr-2" />
        Dataset Explorer
      </div>
      
      <div className="space-y-1">
        {datasets.map((dataset) => (
          <div key={dataset.id} className="text-sm">
            <div 
              className="flex items-center p-2 cursor-pointer hover:bg-slate-800 rounded-md transition-colors"
              onClick={() => toggleDataset(dataset.id)}
            >
              {expandedDatasets[dataset.id] ? (
                <ChevronDown className="w-4 h-4 mr-1 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-1 text-gray-500" />
              )}
              <span>{dataset.name}</span>
            </div>
            
            {expandedDatasets[dataset.id] && (
              <div className="ml-4 space-y-1 mt-1">
                {groupMembersByType(dataset).map(({ type, members }) => (
                  <div key={type} className="mb-2">
                    <div className="text-xs text-gray-500 py-1">
                      {dataset.name}.{type}
                    </div>
                    
                    {members.map((member) => (
                      <div 
                        key={member.id}
                        className="flex items-center p-1 pl-4 cursor-pointer hover:bg-slate-800 rounded-md transition-colors text-gray-300"
                        onClick={() => handleMemberClick(member)}
                      >
                        {getFileIcon(member.type)}
                        <span>{member.name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};