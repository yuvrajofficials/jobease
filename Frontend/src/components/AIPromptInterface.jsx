import React, { useState } from 'react';
import { FiSend, FiCode, FiFile, FiFolder, FiDatabase, FiCpu, FiShield } from 'react-icons/fi';
import { AIAssistant } from './ai/AIAssistant';

const AIPromptInterface = () => {
  const [selectedCategory, setSelectedCategory] = useState('general');

  const examples = {
    dataset: [
      "Create a PDS dataset named USERID.SAMPLE with 10 members",
      "Allocate a sequential dataset with 1000 records",
      "Copy a dataset to a new location with different attributes"
    ],
    jcl: [
      "Create a JCL to compile and link a COBOL program",
      "Write a JCL to sort a dataset using DFSORT",
      "Create a JCL to run a batch job with multiple steps"
    ],
    cobol: [
      "Write a COBOL program to read a VSAM file",
      "Create a COBOL program with DB2 database access",
      "Write a COBOL program to process a sequential file"
    ],
    system: [
      "How to check system resources and performance",
      "How to manage dataset security and access",
      "How to monitor job execution and status"
    ]
  };

  const tips = {
    dataset: [
      "Specify the dataset type (PDS, PDSE, Sequential)",
      "Include space requirements and record format",
      "Mention any specific attributes or organization"
    ],
    jcl: [
      "Specify job card information",
      "Include all required DD statements",
      "Mention any special parameters or conditions"
    ],
    cobol: [
      "Specify the program requirements",
      "Include file handling requirements",
      "Mention any special processing needs"
    ],
    system: [
      "Be specific about the system operation",
      "Include any error conditions to handle",
      "Mention required security levels"
    ]
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">z/OS Expert Assistant</h2>
        <p className="text-gray-600">
          Your specialized mainframe assistant for z/OS operations, JCL, COBOL, and system management.
        </p>
      </div>

      <div className="mb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedCategory('dataset')}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
              selectedCategory === 'dataset'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FiDatabase className="mr-2" />
            Dataset
          </button>
          <button
            onClick={() => setSelectedCategory('jcl')}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
              selectedCategory === 'jcl'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FiFile className="mr-2" />
            JCL
          </button>
          <button
            onClick={() => setSelectedCategory('cobol')}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
              selectedCategory === 'cobol'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FiCode className="mr-2" />
            COBOL
          </button>
          <button
            onClick={() => setSelectedCategory('system')}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
              selectedCategory === 'system'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FiCpu className="mr-2" />
            System
          </button>
        </div>
      </div>

      <div className="mt-6">
        <AIAssistant />
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Tips for {selectedCategory.toUpperCase()}</h3>
        <ul className="list-disc list-inside text-gray-600 space-y-1">
          {tips[selectedCategory].map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center text-blue-800">
          <FiShield className="mr-2" />
          <h3 className="text-lg font-semibold">Security Reminder</h3>
        </div>
        <p className="mt-2 text-blue-600">
          Remember to follow z/OS security best practices and never include sensitive information in your prompts.
        </p>
      </div>
    </div>
  );
};

export default AIPromptInterface; 