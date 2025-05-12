import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';

const TerminalComponent = () => {
  const terminalRef = useRef(null);
  const term = useRef(null);
  const socket = useRef(null);

  useEffect(() => {
    term.current = new Terminal();
    term.current.open(terminalRef.current);

    socket.current = new WebSocket("ws://localhost:8000/ws/terminal");

    term.current.writeln("Welcome to Zowe CLI Terminal");
    term.current.write("> ");

    socket.current.onmessage = (event) => {
      term.current.writeln(event.data);
      term.current.write("> ");
    };

    term.current.onData(data => {
      if (data.charCodeAt(0) === 13) {  // Enter key
        const command = term.current.buffer.active.getLine(term.current.buffer.active.cursorY).translateToString().trim().slice(2);
        socket.current.send(command);
      }
    });

    return () => {
      socket.current.close();
      term.current.dispose();
    };
  }, []);

  return <div ref={terminalRef} style={{ height: "500px", width: "100%", backgroundColor: "#000" }} />;
};

export default TerminalComponent;
