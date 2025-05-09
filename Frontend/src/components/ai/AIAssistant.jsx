import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useMainframe } from '../../context/MainframeContext';

export const AIAssistant = () => {
  const { aiMessages, sendAIMessage, openTabs, activeTabId } = useMainframe();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  


  const handleSubmit = async () => {
    const res = await fetch(`${API_BASE}/agent/assist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: userInput })
    });
    const data = await res.json();
    setResponse(data.response);
  };

  
  const handleSendMessage = () => {
    if (message.trim()) {
      sendAIMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const currentContext = openTabs.find(tab => tab.id === activeTabId)?.content || '';

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
    if (content.includes('```')) {
      const parts = content.split(/(```(?:.*\n)?[\s\S]*?```)/g);
      return (
        <>
          {parts.map((part, i) => {
            if (part.startsWith('```') && part.endsWith('```')) {
              const code = part.replace(/```(?:.*\n)?/, '').replace(/```$/, '');
              return (
                <div key={i} className="my-2">
                  <pre className="bg-slate-900 p-2 rounded font-mono text-sm overflow-x-auto">
                    {code}
                  </pre>
                  <button
                    className="text-xs bg-blue-600 hover:bg-blue-500 text-white py-1 px-2 rounded mt-1 transition-colors"
                    onClick={() => handleUseCode(code)}
                  >
                    Copy to Editor
                  </button>
                </div>
              );
            } else {
              return <p key={i}>{part}</p>;
            }
          })}
        </>
      );
    } else {
      return <p>{content}</p>;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-800">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {aiMessages.map((msg, index) => (
          <div 
            key={index} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] rounded-lg p-3 ${
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
        <div className="flex items-center bg-slate-700 rounded-lg overflow-hidden">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your code..."
            className="flex-1 bg-transparent border-none outline-none p-3 resize-none text-sm max-h-32"
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className={`p-3 ${
              message.trim() 
                ? 'text-blue-400 hover:text-blue-300' 
                : 'text-gray-500 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Try asking: "Explain this JCL" or "Write a COBOL program to add two numbers"
        </div>
      </div>
    </div>
  );
};