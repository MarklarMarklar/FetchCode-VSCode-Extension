#!/usr/bin/env node

/**
 * FetchCoder REST API Server
 * 
 * This server provides REST API endpoints for the FetchCoder VSCode extension
 * by wrapping the fetchcoder CLI commands.
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const FETCHCODER_BIN = path.join(process.env.HOME, '.fetchcoder', 'bin', 'fetchcoder');

// Session storage for managing conversations
// Maps workspacePath -> sessionId
const sessions = new Map();

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function getOrCreateSession(workspacePath) {
  // Use workspace path as session key, or 'default' if none
  const key = workspacePath || 'default';
  
  if (!sessions.has(key)) {
    const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    sessions.set(key, sessionId);
    log(`Created new session: ${sessionId} for workspace: ${key}`);
  }
  
  return sessions.get(key);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

async function executeFetchCoder(message, agent = 'general', context = [], workspacePath = null, history = null) {
  return new Promise((resolve, reject) => {
    const args = ['run'];
    
    // Add agent if specified
    if (agent && agent !== 'general') {
      args.push('--agent', agent);
    }
    
    // Build full message with conversation history
    let fullMessage = '';
    if (history && history.length > 0) {
      // Include last few messages for context (limit to avoid token limits)
      const recentHistory = history.slice(-6); // Last 3 exchanges (6 messages)
      fullMessage = 'Previous conversation:\n';
      recentHistory.forEach(msg => {
        fullMessage += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      fullMessage += '\nCurrent message:\n';
    }
    fullMessage += message;
    
    // Use workspace path if provided, otherwise use current directory
    const cwd = workspacePath || process.cwd();
    
    log(`Executing: echo "<message with history>" | ${FETCHCODER_BIN} ${args.join(' ')}`);
    log(`Working directory: ${cwd}, History: ${history ? history.length + ' messages' : 'none'}`);
    
    const child = spawn(FETCHCODER_BIN, args, {
      cwd: cwd,
      env: {
        ...process.env,
        HOME: process.env.HOME,
        PATH: process.env.PATH
      }
    });
    
    let stdout = '';
    let stderr = '';
    let completed = false;
    
    // Set timeout of 5 minutes for longer tasks
    const timeout = setTimeout(() => {
      if (!completed) {
        completed = true;
        child.kill();
        reject(new Error('Request timed out after 5 minutes'));
      }
    }, 300000); // 5 minutes
    
    // Write message to stdin and close it
    child.stdin.write(fullMessage + '\n');
    child.stdin.end();
    
    child.stdout.on('data', data => {
      stdout += data.toString();
      log(`stdout chunk: ${data.toString().substring(0, 100)}`);
    });
    
    child.stderr.on('data', data => {
      stderr += data.toString();
      log(`stderr chunk: ${data.toString().substring(0, 100)}`);
    });
    
    child.on('close', code => {
      clearTimeout(timeout);
      if (completed) return;
      completed = true;
      
      log(`Process exited with code ${code}`);
      
      if (code !== 0 && code !== null) {
        log(`stderr: ${stderr}`);
        reject(new Error(`FetchCoder failed: ${stderr || 'Unknown error'}`));
      } else {
        // Clean up the output - remove ANSI codes and control characters
        const cleanOutput = stdout
          .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
          .replace(/\x1b\[.*?m/g, '')      // Remove other ANSI sequences
          .replace(/Session saved:.*$/m, '') // Remove session info
          .trim();
        
        log(`Response: ${cleanOutput.substring(0, 100)}...`);
        resolve(cleanOutput);
      }
    });
    
    child.on('error', err => {
      clearTimeout(timeout);
      if (completed) return;
      completed = true;
      log(`Failed to start FetchCoder: ${err.message}`);
      reject(err);
    });
  });
}

// Streaming version that sends progress updates
function executeFetchCoderStreaming(message, agent, context, workspacePath, history, onProgress) {
  return new Promise((resolve, reject) => {
    const args = ['run'];
    
    if (agent && agent !== 'general') {
      args.push('--agent', agent);
    }
    
    // Build full message with conversation history
    let fullMessage = '';
    if (history && history.length > 0) {
      const recentHistory = history.slice(-6);
      fullMessage = 'Previous conversation:\n';
      recentHistory.forEach(msg => {
        fullMessage += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      fullMessage += '\nCurrent message:\n';
    }
    fullMessage += message;
    
    const cwd = workspacePath || process.cwd();
    log(`Streaming execution in: ${cwd}, History: ${history ? history.length + ' messages' : 'none'}`);
    
    const child = spawn(FETCHCODER_BIN, args, {
      cwd: cwd,
      env: {
        ...process.env,
        HOME: process.env.HOME,
        PATH: process.env.PATH
      }
    });
    
    let stdout = '';
    let completed = false;
    
    const timeout = setTimeout(() => {
      if (!completed) {
        completed = true;
        child.kill();
        reject(new Error('Request timed out after 5 minutes'));
      }
    }, 300000);
    
    child.stdin.write(fullMessage + '\n');
    child.stdin.end();
    
    // Stream stdout (actual response)
    child.stdout.on('data', data => {
      const text = data.toString();
      stdout += text;
      onProgress({ type: 'content', data: text });
    });
    
    // Stream stderr (progress indicators, tool calls)
    child.stderr.on('data', data => {
      const text = data.toString();
      // Send progress updates from stderr
      onProgress({ type: 'progress', data: text });
    });
    
    child.on('close', code => {
      clearTimeout(timeout);
      if (completed) return;
      completed = true;
      
      if (code !== 0 && code !== null) {
        reject(new Error(`FetchCoder failed with code ${code}`));
      } else {
        const cleanOutput = stdout
          .replace(/\x1b\[[0-9;]*m/g, '')
          .replace(/\x1b\[.*?m/g, '')
          .replace(/Session saved:.*$/m, '')
          .trim();
        resolve(cleanOutput);
      }
    });
    
    child.on('error', err => {
      clearTimeout(timeout);
      if (!completed) {
        completed = true;
        reject(err);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  log(`${req.method} ${req.url}`);
  
  try {
    // Health check endpoint
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok',
        timestamp: Date.now(),
        version: '1.0.0'
      }));
      return;
    }
    
    // Chat endpoint
    if (req.url === '/api/chat' && req.method === 'POST') {
      const body = await parseBody(req);
      const { message, agent, context, history, stream, workspacePath } = body;
      
      if (!message) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Message is required' }));
        return;
      }
      
      log(`Chat request - Agent: ${agent || 'general'}, Workspace: ${workspacePath || 'none'}, History: ${history ? history.length : 0} messages, Message: ${message.substring(0, 50)}..., Stream: ${stream}`);
      
      // Always use streaming for better progress feedback
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      
      try {
        await executeFetchCoderStreaming(message, agent, context, workspacePath, history, (event) => {
          // Stream progress and content
          if (event.type === 'progress') {
            // Clean ANSI codes from progress messages
            const cleanProgress = event.data
              .replace(/\x1b\[[0-9;]*m/g, '')
              .replace(/\x1b\[.*?m/g, '')
              .trim();
            if (cleanProgress) {
              res.write(`data: ${JSON.stringify({ type: 'progress', text: cleanProgress })}\n\n`);
            }
          } else if (event.type === 'content') {
            // Stream content tokens
            res.write(`data: ${JSON.stringify({ type: 'content', token: event.data })}\n\n`);
          }
        });
        
        // Send completion
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (error) {
        log(`Error executing FetchCoder: ${error.message}`);
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
      }
      return;
    }
    
    // Clear session endpoint
    if (req.url === '/api/session/clear' && req.method === 'POST') {
      const body = await parseBody(req);
      const { workspacePath } = body;
      
      const key = workspacePath || 'default';
      if (sessions.has(key)) {
        const sessionId = sessions.get(key);
        sessions.delete(key);
        log(`Cleared session ${sessionId} for workspace: ${key}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Session cleared' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'No session to clear' }));
      }
      return;
    }
    
    // Command endpoint
    if (req.url === '/api/command' && req.method === 'POST') {
      const body = await parseBody(req);
      const { command, args } = body;
      
      log(`Command request: ${command}`);
      
      // For now, return a simple response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        result: `Command ${command} executed`
      }));
      return;
    }
    
    // Default 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    
  } catch (error) {
    log(`Server error: ${error.message}`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, HOST, () => {
  log(`FetchCoder API Server listening on http://${HOST}:${PORT}`);
  log(`Endpoints:`);
  log(`  GET  /health      - Health check`);
  log(`  POST /api/chat    - Chat with FetchCoder`);
  log(`  POST /api/command - Execute commands`);
  log('');
  log('Ready to accept connections from VSCode extension!');
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  log('Shutting down...');
  server.close(() => {
    log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  log('Shutting down...');
  server.close(() => {
    log('Server closed');
    process.exit(0);
  });
});

