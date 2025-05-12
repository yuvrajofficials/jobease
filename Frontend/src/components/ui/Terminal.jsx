import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';

const TerminalComponent = () => {
  const terminalRef = useRef(null);
  const term = useRef(null);
  const socket = useRef(null);
  const inputBuffer = useRef('');

  useEffect(() => {
    term.current = new Terminal({
      cursorBlink: true,
      theme: { background: '#0f0f0f' },
    });
    term.current.open(terminalRef.current);
    term.current.write("Welcome to Zowe CLI Terminal\r\n> ");

    socket.current = new WebSocket("ws://localhost:8000/api/terminal/ws");

    socket.current.onmessage = (event) => {
      term.current.write(`\r\n${event.data}\r\n> `);
    };

    term.current.onData(data => {
      const code = data.charCodeAt(0);

      // Handle backspace
      if (code === 127) {
        if (inputBuffer.current.length > 0) {
          inputBuffer.current = inputBuffer.current.slice(0, -1);
          term.current.write('\b \b');
        }
      } 
      // Handle Enter
      else if (code === 13) {
        socket.current.send(inputBuffer.current);
        inputBuffer.current = '';
        term.current.write('\r\n');
      } 
      // Add typed character to buffer
      else {
        inputBuffer.current += data;
        term.current.write(data);
      }
    });

    return () => {
      socket.current.close();
      term.current.dispose();
    };
  }, []);

  return <div ref={terminalRef} className='bg-gray-700' style={{ height: "500px", width: "100%" }} />;
};

export default TerminalComponent;
