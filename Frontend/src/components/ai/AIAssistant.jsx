import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, PlayCircle } from 'lucide-react';
import { useMainframe } from '../../context/MainframeContext';

export const AIAssistant = () => {
  const { aiMessages, sendAIMessage, openTabs = [], activeTabId } = useMainframe();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [suggestedCommands, setSuggestedCommands] = useState([]);
  const messagesEndRef = useRef(null);
  


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    console.log('Frontend: Submitting message:', message);
    setIsLoading(true);
    try {
      // Add user message to chat
      const userMessage = { role: 'user', content: message };
      console.log('Frontend: Adding user message to chat:', userMessage);
      setMessages(prev => [...prev, userMessage]);

      console.log('Frontend: Sending request to AI endpoint...');
      const response = await fetch('http://localhost:8000/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          prompt: message,
          mode: activeTab // Send the current mode to the backend
        })
      });

      console.log('Frontend: Response status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to get AI response: ${response.status}`);
      }

      const data = await response.json();
      console.log('Frontend: Received AI response data:', data);
      
      if (activeTab === 'actions' && data.commands) {
        // Handle suggested commands for Actions tab
        setSuggestedCommands(data.commands);
      } else {
        // Handle regular chat response
        const aiMessage = { 
          role: 'assistant', 
          content: data.content || data.response || data.explanation || 'No response received' 
        };
        console.log('Frontend: Adding AI message to chat:', aiMessage);
        setMessages(prev => [...prev, aiMessage]);
      }
      
      // Clear input
      setMessage('');
    } catch (error) {
      console.error('Frontend: Error in handleSubmit:', error);
      // Add error message to chat
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message || 'Failed to get response. Please try again.'}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteCommand = async (command) => {
    try {
      // Get credentials from localStorage
      const credentials = {
        host: localStorage.getItem('host'),
        port: localStorage.getItem('port'),
        username: localStorage.getItem('username'),
        password: localStorage.getItem('password')
      };

      // Validate credentials
      if (!credentials.host || !credentials.port || !credentials.username || !credentials.password) {
        throw new Error('Missing credentials. Please log in again.');
      }

      // Extract the actual command if it's wrapped in a JSON response
      let actualCommand = command;
      try {
        const jsonMatch = command.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          const jsonContent = JSON.parse(jsonMatch[1]);
          if (jsonContent.commands && jsonContent.commands[0]) {
            actualCommand = jsonContent.commands[0].command;
          }
        }
      } catch (e) {
        console.log('Not a JSON command, using as is');
      }

      console.log('Executing command:', actualCommand);

      const response = await fetch('http://localhost:8000/api/ai/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          command: actualCommand,
          credentials
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to execute command');
      }

      const result = await response.json();
      
      // Add execution result to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Command executed successfully:\n\`\`\`\n${typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2)}\n\`\`\``
      }]);
    } catch (error) {
      console.error('Error executing command:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error executing command: ${error.message}`
      }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const currentContext = openTabs?.find(tab => tab.id === activeTabId)?.content || '';

  const handleUseCode = (code) => {
    if (!activeTabId) return;
    
    const codeLines = code.split('\n');
    let startLine = 0;
    let endLine = codeLines.length - 1;
    
    while (startLine <= endLine && codeLines[startLine].trim() === '') {
      startLine++;
    }
    
    while (endLine >= startLine && codeLines[endLine].trim() === '') {
      endLine--;
    }
    
    const trimmedCode = codeLines.slice(startLine, endLine + 1).join('\n');
    
    console.log('Using code:', trimmedCode);
  };

  const renderMessageContent = (content) => {
    console.log('Frontend: Rendering message content:', content);
    
    // Split content into sections based on code blocks and markdown
    const sections = content.split(/(```(?:.*\n)?[\s\S]*?```|\*\*.*?\*\*|\*.*?\*)/g);
    
    return (
      <div className="space-y-2">
        {sections.map((section, i) => {
          // Handle code blocks
          if (section.startsWith('```') && section.endsWith('```')) {
            const code = section.replace(/```(?:.*\n)?/, '').replace(/```$/, '');
            const language = section.match(/```(\w+)/)?.[1] || '';
            return (
              <div key={i} className="my-2">
                <pre className="bg-slate-900 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <code className={`language-${language}`}>{code}</code>
                </pre>
                <button
                  className="text-xs bg-blue-600 hover:bg-blue-500 text-white py-1 px-2 rounded mt-1 transition-colors"
                  onClick={() => handleUseCode(code)}
                >
                  Copy to Editor
                </button>
              </div>
            );
          }
          
          // Handle bold text
          if (section.startsWith('**') && section.endsWith('**')) {
            const text = section.slice(2, -2);
            return <strong key={i} className="font-bold text-blue-400">{text}</strong>;
          }
          
          // Handle italic text
          if (section.startsWith('*') && section.endsWith('*')) {
            const text = section.slice(1, -1);
            return <em key={i} className="italic text-gray-300">{text}</em>;
          }
          
          // Handle bullet points
          if (section.trim().startsWith('* ')) {
            return (
              <ul key={i} className="list-disc list-inside ml-4">
                <li className="text-gray-300">{section.trim().slice(2)}</li>
              </ul>
            );
          }
          
          // Handle regular text
          return <p key={i} className="whitespace-pre-wrap text-gray-200">{section}</p>;
        })}
      </div>
    );
  };

  // Log whenever messages state changes
  useEffect(() => {
    console.log('Frontend: Messages updated:', messages);
  }, [messages]);

  return (
    <div className="h-screen flex flex-col bg-slate-800 w-full">
      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          className={`flex-1 p-3 text-center transition-colors duration-200 ${
            activeTab === 'chat' 
              ? 'bg-slate-700 text-blue-400 border-b-2 border-blue-400' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare className="inline-block mr-2" />
          Chat
        </button>
        <button
          className={`flex-1 p-3 text-center transition-colors duration-200 ${
            activeTab === 'actions' 
              ? 'bg-slate-700 text-blue-400 border-b-2 border-blue-400' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('actions')}
        >
          <PlayCircle className="inline-block mr-2" />
          Actions
        </button>
      </div>

      {/* Chat Interface */}
      {activeTab === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px]">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg p-4 ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-gray-200'
                  }`}
                >
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t border-slate-700">
            <form onSubmit={handleSubmit} className="flex items-center bg-slate-700 rounded-lg overflow-hidden">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about z/OS, JCL, COBOL, or system operations..."
                className="flex-1 bg-transparent border-none outline-none p-3 resize-none text-sm max-h-32 text-white"
                rows={1}
              />
              <button
                type="submit"
                disabled={isLoading || !message.trim()}
                className={`p-3 ${
                  message.trim() && !isLoading
                    ? 'text-blue-400 hover:text-blue-300' 
                    : 'text-gray-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            
            <div className="mt-2 text-xs text-gray-500">
              Try asking: "Explain this JCL" or "Write a COBOL program to add two numbers"
            </div>
          </div>
        </>
      )}

      {/* Actions Interface */}
      {activeTab === 'actions' && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px]">
            {suggestedCommands.map((cmd, index) => (
              <div key={index} className="bg-slate-700 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <pre className="text-sm text-gray-200 font-mono">{cmd.command}</pre>
                  <button
                    onClick={() => handleExecuteCommand(cmd.command)}
                    className="ml-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
                  >
                    Execute
                  </button>
                </div>
                {cmd.description && (
                  <p className="mt-2 text-sm text-gray-400">{cmd.description}</p>
                )}
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t border-slate-700">
            <form onSubmit={handleSubmit} className="flex items-center bg-slate-700 rounded-lg overflow-hidden">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you want to do (e.g., 'Create a PDS dataset named USERID.SAMPLE')..."
                className="flex-1 bg-transparent border-none outline-none p-3 resize-none text-sm max-h-32 text-white"
                rows={1}
              />
              <button
                type="submit"
                disabled={isLoading || !message.trim()}
                className={`p-3 ${
                  message.trim() && !isLoading
                    ? 'text-blue-400 hover:text-blue-300' 
                    : 'text-gray-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};