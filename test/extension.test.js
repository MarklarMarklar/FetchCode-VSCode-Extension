"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const fetchcoderClient_1 = require("../src/api/fetchcoderClient");
const config_1 = require("../src/config");
suite('FetchCoder Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');
    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('fetchai.fetchcoder-vscode'));
    });
    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('fetchai.fetchcoder-vscode');
        assert.ok(extension);
        await extension.activate();
        assert.strictEqual(extension.isActive, true);
    });
    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        const expectedCommands = [
            'fetchcoder.openChat',
            'fetchcoder.openCompose',
            'fetchcoder.sendSelection',
            'fetchcoder.explain',
            'fetchcoder.refactor',
            'fetchcoder.fix',
            'fetchcoder.switchAgent',
            'fetchcoder.clearHistory',
            'fetchcoder.checkConnection'
        ];
        expectedCommands.forEach(cmd => {
            assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`);
        });
    });
    test('Configuration should have default values', () => {
        config_1.FetchCoderConfig.initialize();
        const config = config_1.FetchCoderConfig.getAll();
        assert.strictEqual(config.apiUrl, 'http://localhost:3000');
        assert.strictEqual(config.defaultAgent, 'general');
        assert.strictEqual(config.autoContextFiles, 5);
        assert.strictEqual(config.enableInlineActions, true);
        assert.strictEqual(config.streamResponses, true);
    });
    test('FetchCoder client should be created', () => {
        const client = (0, fetchcoderClient_1.getFetchCoderClient)();
        assert.ok(client);
        assert.strictEqual(typeof client.getBaseUrl, 'function');
        assert.strictEqual(typeof client.sendMessage, 'function');
    });
    test('FetchCoder client should have correct default agent', () => {
        const client = (0, fetchcoderClient_1.getFetchCoderClient)();
        const agent = client.getAgent();
        assert.ok(['general', 'build', 'plan', 'agentverse'].includes(agent));
    });
    test('Agent switching should work', () => {
        const client = (0, fetchcoderClient_1.getFetchCoderClient)();
        client.setAgent('build');
        assert.strictEqual(client.getAgent(), 'build');
        client.setAgent('plan');
        assert.strictEqual(client.getAgent(), 'plan');
        client.setAgent('agentverse');
        assert.strictEqual(client.getAgent(), 'agentverse');
    });
    test('API URL should be configurable', () => {
        const client = (0, fetchcoderClient_1.getFetchCoderClient)();
        const originalUrl = client.getBaseUrl();
        client.updateBaseUrl('http://localhost:8080');
        assert.strictEqual(client.getBaseUrl(), 'http://localhost:8080');
        // Restore original
        client.updateBaseUrl(originalUrl);
    });
    // Integration tests (require FetchCoder server running)
    suite('Integration Tests (requires FetchCoder server)', () => {
        test('Health check should work when server is running', async function () {
            this.timeout(10000);
            const client = (0, fetchcoderClient_1.getFetchCoderClient)();
            const isHealthy = await client.checkHealth();
            if (isHealthy) {
                assert.ok(true, 'FetchCoder API is healthy');
            }
            else {
                console.log('⚠️  FetchCoder server not running - skipping integration test');
                this.skip();
            }
        });
        test('Should be able to send a simple message', async function () {
            this.timeout(15000);
            const client = (0, fetchcoderClient_1.getFetchCoderClient)();
            const isHealthy = await client.checkHealth();
            if (!isHealthy) {
                console.log('⚠️  FetchCoder server not running - skipping integration test');
                this.skip();
                return;
            }
            const response = await client.sendMessage({
                message: 'What is 2+2?',
                agent: 'general'
            });
            assert.ok(response);
            assert.ok(!response.error, `Should not have error: ${response.error}`);
            assert.ok(response.response, 'Should have a response');
            assert.ok(response.response.length > 0, 'Response should not be empty');
        });
    });
});
//# sourceMappingURL=extension.test.js.map