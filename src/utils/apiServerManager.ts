import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as http from 'http';
import { spawn, ChildProcess } from 'child_process';

export class ApiServerManager {
    private static instance: ApiServerManager;
    private serverProcess: ChildProcess | null = null;
    private readonly apiServerPort: number = 3000;
    private readonly homeDir: string = os.homedir();
    private readonly fetchcoderDir: string;
    private readonly apiServerPath: string;
    private extensionContext: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.extensionContext = context;
        this.fetchcoderDir = path.join(this.homeDir, '.fetchcoder');
        this.apiServerPath = path.join(this.fetchcoderDir, 'api-server.js');
    }

    public static getInstance(context: vscode.ExtensionContext): ApiServerManager {
        if (!ApiServerManager.instance) {
            ApiServerManager.instance = new ApiServerManager(context);
        }
        return ApiServerManager.instance;
    }

    /**
     * Check if API server is installed in ~/.fetchcoder/
     */
    public isInstalled(): boolean {
        return fs.existsSync(this.apiServerPath);
    }

    /**
     * Check if API server is currently running
     */
    public async isRunning(): Promise<boolean> {
        return new Promise((resolve) => {
            const req = http.get(
                {
                    hostname: 'localhost',
                    port: this.apiServerPort,
                    path: '/health',
                    timeout: 5000
                },
                (res) => {
                    resolve(res.statusCode === 200);
                }
            );

            req.on('error', () => {
                resolve(false);
            });

            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    /**
     * Install API server files from extension to ~/.fetchcoder/
     */
    public async install(): Promise<void> {
        const extensionPath = this.extensionContext.extensionPath;
        const apiServerSource = path.join(extensionPath, 'api-server');

        // Create .fetchcoder directory if it doesn't exist
        if (!fs.existsSync(this.fetchcoderDir)) {
            fs.mkdirSync(this.fetchcoderDir, { recursive: true });
        }

        // Copy all API server files
        await this.copyDirectory(apiServerSource, this.fetchcoderDir);

        // Make shell scripts executable (Unix-like systems)
        if (process.platform !== 'win32') {
            const scripts = ['start-api-server.sh', 'stop-api-server.sh'];
            for (const script of scripts) {
                const scriptPath = path.join(this.fetchcoderDir, script);
                if (fs.existsSync(scriptPath)) {
                    fs.chmodSync(scriptPath, 0o755);
                }
            }
        }

        console.log('FetchCoder: API server files installed to', this.fetchcoderDir);
    }

    /**
     * Start the API server
     */
    public async start(): Promise<boolean> {
        // Check if already running
        if (await this.isRunning()) {
            console.log('FetchCoder: API server is already running');
            return true;
        }

        // Check if installed
        if (!this.isInstalled()) {
            throw new Error('API server not installed. Please run setup first.');
        }

        return new Promise((resolve) => {
            console.log('FetchCoder: Starting API server...');

            // Use node to run the API server
            const nodePath = process.execPath;
            this.serverProcess = spawn(nodePath, [this.apiServerPath], {
                cwd: this.fetchcoderDir,
                detached: true,
                stdio: 'ignore',
                env: {
                    ...process.env,
                    PORT: this.apiServerPort.toString(),
                    HOST: '127.0.0.1'
                }
            });

            // Detach the process so it continues running
            this.serverProcess.unref();

            // Wait a bit for server to start, then verify
            setTimeout(async () => {
                const running = await this.isRunning();
                if (running) {
                    console.log('FetchCoder: API server started successfully');
                    resolve(true);
                } else {
                    console.log('FetchCoder: API server failed to start');
                    resolve(false);
                }
            }, 2000);
        });
    }

    /**
     * Stop the API server
     */
    public async stop(): Promise<void> {
        // Try to stop via PID file
        const pidFile = path.join(this.fetchcoderDir, 'api-server.pid');
        
        if (fs.existsSync(pidFile)) {
            try {
                const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim());
                if (pid) {
                    process.kill(pid, 'SIGTERM');
                    console.log('FetchCoder: API server stopped (PID:', pid, ')');
                }
                fs.unlinkSync(pidFile);
            } catch (error) {
                console.log('FetchCoder: Could not stop API server via PID file');
            }
        }

        // Also stop our process if we have a reference
        if (this.serverProcess) {
            this.serverProcess.kill();
            this.serverProcess = null;
        }
    }

    /**
     * Setup: Install and start the API server
     */
    public async setup(): Promise<boolean> {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Setting up FetchCoder API server...',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Installing API server files...' });
                await this.install();

                progress.report({ message: 'Starting API server...' });
                await this.start();
            });

            return await this.isRunning();
        } catch (error: any) {
            console.error('FetchCoder: Setup failed:', error);
            throw error;
        }
    }

    /**
     * Ensure API server is ready (install and start if needed)
     */
    public async ensureRunning(): Promise<boolean> {
        // Check if already running
        if (await this.isRunning()) {
            return true;
        }

        // Check if installed
        if (!this.isInstalled()) {
            console.log('FetchCoder: API server not installed, installing...');
            await this.install();
        }

        // Start the server
        return await this.start();
    }

    /**
     * Get API server status information
     */
    public async getStatus(): Promise<{
        installed: boolean;
        running: boolean;
        port: number;
        url: string;
    }> {
        return {
            installed: this.isInstalled(),
            running: await this.isRunning(),
            port: this.apiServerPort,
            url: `http://localhost:${this.apiServerPort}`
        };
    }

    /**
     * Helper: Copy directory recursively
     */
    private async copyDirectory(src: string, dest: string): Promise<void> {
        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                if (!fs.existsSync(destPath)) {
                    fs.mkdirSync(destPath, { recursive: true });
                }
                await this.copyDirectory(srcPath, destPath);
            } else {
                // Skip certain files
                if (entry.name.endsWith('.pid') || entry.name.endsWith('.log')) {
                    continue;
                }
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    /**
     * Check if FetchCoder CLI is installed
     */
    public isFetchCoderCliInstalled(): boolean {
        const fetchcoderBin = path.join(this.fetchcoderDir, 'bin', 'fetchcoder');
        return fs.existsSync(fetchcoderBin);
    }

    /**
     * Dispose and cleanup
     */
    public dispose(): void {
        // Note: We don't stop the server on extension deactivation
        // because the user might want it to keep running
        // They can manually stop it if needed
        console.log('FetchCoder: ApiServerManager disposed');
    }
}

