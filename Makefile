.PHONY: help start stop restart status logs install package clean

help: ## Show this help message
	@echo "FetchCoder VS Code Extension - Quick Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

start: ## Start the API server
	@./api-server/start-api-server.sh

stop: ## Stop the API server
	@./api-server/stop-api-server.sh

restart: stop start ## Restart the API server

status: ## Check if API server is running
	@echo "Checking API server status..."
	@curl -s http://localhost:3000/health | jq . 2>/dev/null || echo "❌ Server not responding"

logs: ## View API server logs (live)
	@tail -f ./api-server/api-server.log

install: ## Install dependencies and compile
	@echo "Installing dependencies..."
	@npm install
	@echo "Compiling TypeScript..."
	@npm run compile
	@echo "✓ Done!"

package: install ## Package the extension as VSIX
	@echo "Packaging extension..."
	@npx @vscode/vsce package --allow-star-activation
	@echo "✓ Extension packaged successfully!"

clean: ## Clean build artifacts
	@echo "Cleaning..."
	@rm -rf out/
	@rm -rf node_modules/
	@rm -f *.vsix
	@rm -f api-server/api-server.pid
	@echo "✓ Clean complete!"

dev: install start ## Setup everything for development
	@echo ""
	@echo "✓ Development environment ready!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Press F5 in VS Code to launch Extension Development Host"
	@echo "  2. Open a folder in the new window"
	@echo "  3. Press Ctrl+Shift+F C to open FetchCoder Chat"

