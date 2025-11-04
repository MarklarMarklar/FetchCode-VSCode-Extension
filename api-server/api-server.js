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
const FETCHCODER_BIN = path.join(process.env.HOME, '.fetchcoder', 'bin', 'fetchcoder-backend');

// Session storage for managing conversations
const sessions = new Map();

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function createSession() {
  const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  sessions.set(sessionId, {
    id: sessionId,
    messages: [],
    created: Date.now()
  });
  return sessionId;
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

async function executeFetchCoder(message, agent = 'general', context = []) {
  return new Promise((resolve, reject) => {
    const args = ['run'];
    
    // Add agent if specified
    if (agent && agent !== 'general') {
      args.push('--agent', agent);
    }
    
    log(`Executing: echo "${message}" | ${FETCHCODER_BIN} ${args.join(' ')}`);
    
    const child = spawn(FETCHCODER_BIN, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HOME: process.env.HOME,
        PATH: process.env.PATH
      }
    });
    
    let stdout = '';
    let stderr = '';
    let completed = false;
    
    // Set timeout of 60 seconds
    const timeout = setTimeout(() => {
      if (!completed) {
        completed = true;
        child.kill();
        reject(new Error('Request timed out after 60 seconds'));
      }
    }, 60000);
    
    // Write message to stdin and close it
    child.stdin.write(message + '\n');
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
      const { message, agent, context, history, stream } = body;
      
      if (!message) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Message is required' }));
        return;
      }
      
      log(`Chat request - Agent: ${agent || 'general'}, Message: ${message.substring(0, 50)}..., Stream: ${stream}`);
      
      try {
        const response = await executeFetchCoder(message, agent, context);
        
        // If streaming is requested, send as SSE format
        if (stream) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          });
          
          // Send the response text as data
          res.write(`data: ${JSON.stringify({ content: response })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        } else {
          // Regular JSON response
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            response: response,
            agent: agent || 'general',
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        log(`Error executing FetchCoder: ${error.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: error.message,
          response: 'Sorry, I encountered an error processing your request.'
        }));
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

