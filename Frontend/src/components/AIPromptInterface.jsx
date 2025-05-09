import React, { useState } from 'react';
import { FiSend, FiCode, FiFile, FiFolder } from 'react-icons/fi';

const AIPromptInterface = ({ onPromptSubmit }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      await onPromptSubmit(prompt);
    } catch (error) {
      console.error('Error submitting prompt:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">AI-Powered z/OS Assistant</h2>
        <p className="text-gray-600">
          Describe what you want to do with z/OS, and I'll help you set up the necessary files and structure.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: I want to create a COBOL program that reads a dataset and processes customer records..."
            className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              type="button"
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              <FiCode className="mr-2" />
              View Examples
            </button>
            <button
              type="button"
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              <FiFolder className="mr-2" />
              Browse Templates
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className={`flex items-center px-6 py-2 text-white font-medium rounded-md ${
              isLoading || !prompt.trim()
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <FiSend className="mr-2" />
            {isLoading ? 'Processing...' : 'Generate'}
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Tips</h3>
        <ul className="list-disc list-inside text-gray-600 space-y-1">
          <li>Be specific about the type of program you want to create</li>
          <li>Mention any specific datasets or files you want to work with</li>
          <li>Include any special requirements or constraints</li>
        </ul>
      </div>
    </div>
  );
};

export default AIPromptInterface; 