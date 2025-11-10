import * as vscode from 'vscode';
import { FetchCoderConfig } from '../config';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatRequest {
    message: string;
    agent?: string;
    context?: {
        files?: Array<{ path: string; content: string }>;
        selection?: string;
        language?: string;
        workspacePath?: string;
    };
    history?: ChatMessage[];
}

export interface ChatResponse {
    response: string;
    agent?: string;
    error?: string;
}

export interface StreamCallback {
    onToken: (token: string) => void;
    onProgress?: (progress: string) => void;
    onComplete: (fullResponse: string) => void;
    onError: (error: Error) => void;
}

export class FetchCoderClient {
    private baseUrl: string;
    private currentAgent: string;

    constructor() {
        this.baseUrl = FetchCoderConfig.get('apiUrl');
        this.currentAgent = FetchCoderConfig.get('defaultAgent');
    }

    setAgent(agent: string) {
        this.currentAgent = agent;
    }

    getAgent(): string {
        return this.currentAgent;
    }

    async checkHealth(): Promise<boolean> {
        try {
            // Try to connect to the base URL - FetchCoder may not have /health endpoint
            const response = await fetch(`${this.baseUrl}/`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            // Accept any response (200, 404, etc.) as long as server is reachable
            return true;
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }

    async sendMessage(request: ChatRequest): Promise<ChatResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: request.message,
                    agent: request.agent || this.currentAgent,
                    context: request.context,
                    history: request.history,
                    workspacePath: request.context?.workspacePath
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const data = await response.json() as any;
            return {
                response: data.response || data.message || '',
                agent: data.agent
            };
        } catch (error: any) {
            console.error('FetchCoder API error:', error);
            return {
                response: '',
                error: error.message || 'Failed to communicate with FetchCoder API'
            };
        }
    }

    async sendMessageStreaming(request: ChatRequest, callback: StreamCallback): Promise<void> {
        try {
            const payload = {
                message: request.message,
                agent: request.agent || this.currentAgent,
                context: request.context,
                history: request.history,
                stream: true,
                workspacePath: request.context?.workspacePath
            };
            
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'Content-Type': 'application/json',
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }

            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    callback.onComplete(fullResponse);
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            callback.onComplete(fullResponse);
                            return;
                        }
                        try {
                            const json = JSON.parse(data);
                            
                            // Handle different event types
                            if (json.type === 'progress') {
                                // Progress update (tool calls, file operations, etc.)
                                if (callback.onProgress) {
                                    callback.onProgress(json.text);
                                }
                            } else if (json.type === 'content') {
                                // Content token
                                const token = json.token || '';
                                if (token) {
                                    fullResponse += token;
                                    callback.onToken(token);
                                }
                            } else if (json.type === 'error') {
                                // Error event
                                callback.onError(new Error(json.error || 'Unknown error'));
                                return;
                            } else {
                                // Fallback: treat as content
                                const token = json.token || json.delta || json.content || '';
                                if (token) {
                                    fullResponse += token;
                                    callback.onToken(token);
                                }
                            }
                        } catch (e) {
                            // Not JSON, treat as plain text
                            if (data.trim()) {
                                fullResponse += data;
                                callback.onToken(data);
                            }
                        }
                    } else if (line.trim() && !line.startsWith(':')) {
                        // Plain text response (non-SSE)
                        fullResponse += line;
                        callback.onToken(line);
                    }
                }
            }

        } catch (error: any) {
            console.error('Streaming error:', error);
            callback.onError(error);
        }
    }

    async executeCommand(command: string, args?: any): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/api/command`, {
                method: 'POST',
                headers: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command,
                    args
                })
            });

            if (!response.ok) {
                throw new Error(`Command execution failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error: any) {
            console.error('Command execution error:', error);
            throw error;
        }
    }

    getBaseUrl(): string {
        return this.baseUrl;
    }

    updateBaseUrl(url: string) {
        this.baseUrl = url;
    }
}

// Singleton instance
let clientInstance: FetchCoderClient | null = null;

export function getFetchCoderClient(): FetchCoderClient {
    if (!clientInstance) {
        clientInstance = new FetchCoderClient();
    }
    return clientInstance;
}

export function resetFetchCoderClient() {
    clientInstance = new FetchCoderClient();
    return clientInstance;
}

