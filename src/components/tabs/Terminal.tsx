import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Terminal as TerminalIcon, 
  Send, 
  Trash2, 
  Download,
  Settings,
  Server,
  Play,
  Square
} from 'lucide-react';

interface TerminalSession {
  id: string;
  server: string;
  status: 'connected' | 'disconnected' | 'connecting';
  lastActivity: string;
}

interface TerminalMessage {
  id: string;
  type: 'command' | 'output' | 'error' | 'system';
  content: string;
  timestamp: Date;
  server?: string;
}

export function Terminal() {
  const [activeSession, setActiveSession] = useState<string>('server1.example.com');
  const [command, setCommand] = useState('');
  const [messages, setMessages] = useState<TerminalMessage[]>([
    {
      id: '1',
      type: 'system',
      content: 'Connected to server1.example.com',
      timestamp: new Date(Date.now() - 300000),
      server: 'server1.example.com'
    },
    {
      id: '2',
      type: 'command',
      content: 'cd /root/NAM/Servis && ls -la',
      timestamp: new Date(Date.now() - 240000),
      server: 'server1.example.com'
    },
    {
      id: '3',
      type: 'output',
      content: `total 48
drwxr-xr-x 2 root root 4096 Jan 15 10:30 .
drwxr-xr-x 3 root root 4096 Jan 15 09:15 ..
-rw-r--r-- 1 root root  156 Jan 15 10:30 config.txt
-rw-r--r-- 1 root root 2048 Jan 15 10:25 sers1.py
-rw-r--r-- 1 root root 3072 Jan 15 10:25 sers2.go
-rw-r--r-- 1 root root 1024 Jan 15 10:30 stats_12345.json
-rw-r--r-- 1 root root 5120 Jan 15 10:28 valid.txt`,
      timestamp: new Date(Date.now() - 235000),
      server: 'server1.example.com'
    },
    {
      id: '4',
      type: 'command',
      content: 'python3 sers1.py',
      timestamp: new Date(Date.now() - 180000),
      server: 'server1.example.com'
    },
    {
      id: '5',
      type: 'output',
      content: '[INFO] Starting Fortinet VPN scanner...\n[INFO] Loaded 15420 credentials\n[INFO] Using 2500 threads\n🔥 G:1247 B:8934 E:156 Off:89 Blk:23 | ⚡2847.3/s | ⏱️2m15s',
      timestamp: new Date(Date.now() - 175000),
      server: 'server1.example.com'
    }
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([
    'cd /root/NAM/Servis && ls -la',
    'python3 sers1.py',
    'ps aux | grep python',
    'tail -f valid.txt',
    'systemctl status ssh'
  ]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sessions: TerminalSession[] = [
    { id: 'server1.example.com', server: 'server1.example.com', status: 'connected', lastActivity: '2 min ago' },
    { id: 'server2.example.com', server: 'server2.example.com', status: 'connected', lastActivity: '5 min ago' },
    { id: 'server3.example.com', server: 'server3.example.com', status: 'disconnected', lastActivity: '1 hour ago' },
    { id: 'server4.example.com', server: 'server4.example.com', status: 'connected', lastActivity: '30 sec ago' }
  ];

  const quickCommands = [
    { label: 'List Files', command: 'ls -la /root/NAM/Servis/' },
    { label: 'Check Processes', command: 'ps aux | grep python' },
    { label: 'View Stats', command: 'cat /root/NAM/Servis/stats_*.json | tail -1' },
    { label: 'Tail Valid', command: 'tail -f /root/NAM/Servis/valid.txt' },
    { label: 'System Info', command: 'uname -a && free -h && df -h' },
    { label: 'Stop Scanner', command: 'pkill -f sers' }
  ];

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendCommand = () => {
    if (!command.trim()) return;

    const newMessage: TerminalMessage = {
      id: Date.now().toString(),
      type: 'command',
      content: command,
      timestamp: new Date(),
      server: activeSession
    };

    setMessages(prev => [...prev, newMessage]);
    
    // Add to history
    setCommandHistory(prev => [command, ...prev.filter(cmd => cmd !== command)].slice(0, 50));
    setHistoryIndex(-1);

    // Simulate command execution
    setTimeout(() => {
      const output = simulateCommandOutput(command);
      const outputMessage: TerminalMessage = {
        id: (Date.now() + 1).toString(),
        type: output.includes('Error') || output.includes('error') ? 'error' : 'output',
        content: output,
        timestamp: new Date(),
        server: activeSession
      };
      setMessages(prev => [...prev, outputMessage]);
    }, 500 + Math.random() * 1000);

    setCommand('');
  };

  const simulateCommandOutput = (cmd: string): string => {
    const lowerCmd = cmd.toLowerCase();
    
    if (lowerCmd.includes('ls')) {
      return `config.txt  sers1.py  sers2.go  sers3.py  sers4.go  stats_12345.json  valid.txt`;
    } else if (lowerCmd.includes('ps') && lowerCmd.includes('python')) {
      return `root      12345  0.5  2.1  45678  8912 pts/0    S+   10:30   0:02 python3 sers1.py
root      12346  0.3  1.8  34567  7234 pts/1    S+   10:31   0:01 python3 sers3.py`;
    } else if (lowerCmd.includes('cat') && lowerCmd.includes('stats')) {
      return `{"goods":1247,"bads":8934,"errors":156,"offline":89,"ipblock":23,"processed":10449,"rps":2847.3,"timestamp":${Date.now()}}`;
    } else if (lowerCmd.includes('tail') && lowerCmd.includes('valid')) {
      // Sample placeholders for demo output only
      return `vpn1.example.com:443;user1;pass1
vpn2.example.com:443;user2;pass2
vpn3.example.com:443;user3;pass3
vpn4.example.com:443;user4;pass4`;
    } else if (lowerCmd.includes('uname')) {
      return `Linux vpn-worker 5.4.0-74-generic #83-Ubuntu SMP Sat May 8 02:35:39 UTC 2021 x86_64 x86_64 x86_64 GNU/Linux
              total        used        free      shared  buff/cache   available
Mem:           7.8G        2.1G        3.2G        156M        2.5G        5.4G
Swap:          2.0G          0B        2.0G
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        20G  8.2G   11G  44% /
tmpfs           3.9G     0  3.9G   0% /dev/shm`;
    } else if (lowerCmd.includes('pkill')) {
      return `Stopped 2 scanner processes`;
    } else if (lowerCmd.includes('python3 sers')) {
      return `[INFO] Starting VPN scanner...
[INFO] Loaded credentials from part_1.txt
[INFO] Using 2500 threads
[INFO] Target RPS: 8000
🔥 Starting ultra-fast engine...`;
    } else if (lowerCmd.includes('cd')) {
      return ``;
    } else {
      return `Command executed successfully`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const clearTerminal = () => {
    setMessages([]);
  };

  const downloadLogs = () => {
    const logs = messages.map(msg => 
      `[${msg.timestamp.toISOString()}] [${msg.type.toUpperCase()}] ${msg.content}`
    ).join('\n');
    
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-logs-${activeSession}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const connectToServer = (serverId: string) => {
    setActiveSession(serverId);
    const systemMessage: TerminalMessage = {
      id: Date.now().toString(),
      type: 'system',
      content: `Connected to ${serverId}`,
      timestamp: new Date(),
      server: serverId
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'disconnected': return 'error';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Web Terminal</h1>
          <p className="text-gray-600 mt-1">Remote server management and monitoring</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="ghost" onClick={clearTerminal}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
          <Button variant="ghost" onClick={downloadLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
          <Button variant="primary">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Server Sessions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Server Sessions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                activeSession === session.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => connectToServer(session.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Server className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-gray-900">{session.server}</span>
                </div>
                <Badge variant={getStatusColor(session.status) as any} size="sm">
                  {session.status}
                </Badge>
              </div>
              <p className="text-xs text-gray-500">Last: {session.lastActivity}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Commands */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Commands</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {quickCommands.map((cmd, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="text-left justify-start"
              onClick={() => setCommand(cmd.command)}
            >
              <Play className="h-3 w-3 mr-2" />
              {cmd.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Terminal */}
      <Card className="bg-gray-900 text-green-400 font-mono">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <TerminalIcon className="h-5 w-5" />
            <span className="text-sm">Terminal - {activeSession}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="success" size="sm">Connected</Badge>
          </div>
        </div>

        {/* Terminal Output */}
        <div
          ref={terminalRef}
          className="h-96 overflow-y-auto mb-4 p-2 bg-black rounded border border-gray-700"
        >
          {messages
            .filter(msg => !msg.server || msg.server === activeSession)
            .map(message => (
              <div key={message.id} className="mb-1">
                <span className="text-gray-500 text-xs">
                  [{message.timestamp.toLocaleTimeString()}]
                </span>
                {message.type === 'command' && (
                  <div className="text-yellow-400">
                    <span className="text-green-400">{activeSession}:~$ </span>
                    {message.content}
                  </div>
                )}
                {message.type === 'output' && (
                  <div className="text-gray-300 whitespace-pre-wrap pl-4">
                    {message.content}
                  </div>
                )}
                {message.type === 'error' && (
                  <div className="text-red-400 whitespace-pre-wrap pl-4">
                    {message.content}
                  </div>
                )}
                {message.type === 'system' && (
                  <div className="text-blue-400 italic">
                    {message.content}
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* Command Input */}
        <div className="flex items-center space-x-2">
          <span className="text-green-400 flex-shrink-0">
            {activeSession}:~$
          </span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-green-400 font-mono"
            placeholder="Enter command..."
            autoFocus
          />
          <Button
            size="sm"
            variant="primary"
            onClick={handleSendCommand}
            disabled={!command.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Command History Hint */}
        <div className="mt-2 text-xs text-gray-500">
          Use ↑/↓ arrows to navigate command history • Ctrl+C to interrupt • Ctrl+L to clear
        </div>
      </Card>

      {/* Terminal Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <h4 className="font-semibold text-gray-900 mb-2">Session Info</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Server: {activeSession}</p>
            <p>User: root</p>
            <p>Shell: /bin/bash</p>
            <p>Encoding: UTF-8</p>
          </div>
        </Card>

        <Card>
          <h4 className="font-semibold text-gray-900 mb-2">Connection</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Protocol: SSH</p>
            <p>Port: 22</p>
            <p>Latency: 45ms</p>
            <p>Uptime: 2h 15m</p>
          </div>
        </Card>

        <Card>
          <h4 className="font-semibold text-gray-900 mb-2">Statistics</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Commands: {messages.filter(m => m.type === 'command').length}</p>
            <p>Errors: {messages.filter(m => m.type === 'error').length}</p>
            <p>Session time: 45m</p>
            <p>Data transferred: 2.3 MB</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
