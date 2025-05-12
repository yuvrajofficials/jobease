import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, PlayCircle } from 'lucide-react';
import { useMainframe } from '../../context/MainframeContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const AIAssistant = () => {
  const { openTabs = [], activeTabId } = useMainframe();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [actionMessages, setActionMessages] = useState([]);
  const [suggestedCommands, setSuggestedCommands] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [chatMessages, actionMessages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    setMessage('');
    const userMessage = { role: 'user', content: message };

    try {
      if (activeTab === 'chat') {
        setChatMessages((prev) => [...prev, userMessage]);
      } else {
        setActionMessages((prev) => [...prev, userMessage]);
      }

      const response = await fetch('http://localhost:8000/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ prompt: message, mode: activeTab }),
      });

      if (!response.ok) throw new Error(`AI error ${response.status}`);
      const data = await response.json();

      const botMessage = {
        role: 'assistant',
        content: data.content || data.response || 'No response',
      };

      if (activeTab === 'actions' && data.commands) {
        setSuggestedCommands(data.commands);
      }

      if (activeTab === 'chat') {
        setChatMessages((prev) => [...prev, botMessage]);
      } else {
        setActionMessages((prev) => [...prev, botMessage]);
      }

      setMessage('');
    } catch (err) {
      const errorMsg = { role: 'assistant', content: `Error: ${err.message}` };
      if (activeTab === 'chat') {
        setChatMessages((prev) => [...prev, errorMsg]);
      } else {
        setActionMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteCommand = async (command) => {
    try {
      const credentials = {
        host: localStorage.getItem('host'),
        port: localStorage.getItem('port'),
        username: localStorage.getItem('username'),
        password: localStorage.getItem('password'),
      };

      if (!credentials.host || !credentials.port || !credentials.username || !credentials.password) {
        throw new Error('Missing credentials. Please log in again.');
      }

      const response = await fetch('http://localhost:8000/api/ai/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ command, credentials }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to execute command');
      }

      const result = await response.json();
      const assistantMsg = {
        role: 'assistant',
        content: `Command executed:\n\`\`\`\n${typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2)}\n\`\`\``,
      };
      setActionMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      const errMsg = { role: 'assistant', content: `Execution error: ${error.message}` };
      setActionMessages((prev) => [...prev, errMsg]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleUseCode = (code) => {
    console.log('Using code:', code.trim());
  };

  const renderMessageContent = (content) => {
    const sections = content.split(/(```(?:.*\n)?[\s\S]*?```|\*\*.*?\*\*|\*.*?\*|\n)/g);

    return (
      <div className="space-y-2">
        {sections.map((section, i) => {
          if (section.startsWith('```') && section.endsWith('```')) {
            const code = section.replace(/```(?:.*\n)?/, '').replace(/```$/, '');
            const language = section.match(/```(\w+)/)?.[1] || '';
            return (
              <div key={i} className="my-2">
                <pre className="bg-gray-900 text-gray-100 rounded-md text-sm p-4 overflow-x-auto font-mono">
                  <code className={`language-${language}`}>{code}</code>
                </pre>
                <button
                  onClick={() => handleUseCode(code)}
                  className="mt-1 text-xs bg-blue-600 hover:bg-blue-500 text-white py-1 px-2 rounded transition"
                >
                  Copy to Editor
                </button>
              </div>
            );
          }

          if (section.startsWith('**') && section.endsWith('**')) {
            return <strong key={i} className="font-semibold text-blue-400">{section.slice(2, -2)}</strong>;
          }

          if (section.startsWith('*') && section.endsWith('*')) {
            return <em key={i} className="italic text-gray-300">{section.slice(1, -1)}</em>;
          }

          if (section.trim().startsWith('* ')) {
            return (
              <ul key={i} className="list-disc list-inside ml-4 text-gray-300 text-sm">
                <li>{section.trim().slice(2)}</li>
              </ul>
            );
          }

          return <p key={i} className="whitespace-pre-wrap text-gray-200 text-sm">{section}</p>;
        })}
      </div>
    );
  };

  const currentMessages = activeTab === 'chat' ? chatMessages : actionMessages;

  return (
    <div className="h-full flex flex-col bg-slate-800 text-white">
      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {['chat', 'actions'].map((tab) => (
          <button
            key={tab}
            className={`flex-1 p-3 text-center transition-all text-sm font-medium ${
              activeTab === tab
                ? 'bg-slate-700 text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'chat' ? <MessageSquare className="inline-block mr-2" /> : <PlayCircle className="inline-block mr-2" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Chat / Action Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px]">
        {currentMessages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-100'
              }`}
            >
              {renderMessageContent(msg.content)}
            </div>
          </div>
        ))}

        {activeTab === 'actions' && suggestedCommands.length > 0 && (
          <div className="space-y-4">
            {suggestedCommands.map((cmd, index) => (
              <div key={index} className="bg-slate-700 rounded-lg p-4 w-fit max-w-full">
                <div className="prose prose-invert text-sm text-gray-200 max-w-none mb-2">
                  <ReactMarkdown children={`\`\`\`bash\n${cmd.command}\n\`\`\``} remarkPlugins={[remarkGfm]} />
                </div>
                {cmd.description && (
                  <div className="prose prose-invert text-gray-400 text-sm">
                    <ReactMarkdown children={cmd.description} remarkPlugins={[remarkGfm]} />
                  </div>
                )}
                <button
                  onClick={() => handleExecuteCommand(cmd.command)}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition"
                >
                  Execute
                </button>
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-slate-700">
        <form onSubmit={handleSubmit} className="flex items-center bg-slate-700 rounded-lg overflow-hidden">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeTab === 'chat'
                ? 'Ask a question about z/OS, JCL, COBOL...'
                : "Describe what you want to do (e.g., 'Create a PDS dataset')"
            }
            className="flex-1 bg-transparent border-none outline-none p-3 resize-none text-sm text-white"
            rows={3}
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
    </div>
  );
};
