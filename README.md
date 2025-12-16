# Telegram
Tg 1

## 🚀 **Quick Deployment Script**

Create a `deploy.sh` file:
```bash
#!/bin/bash
echo "🚀 Deploying Red Dragon GWE Bot..."

# Create directory
mkdir -p reddragon-bot
cd reddragon-bot

# Create files
echo "Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "reddragon-gwe-bot",
  "version": "1.0.0",
  "description": "Red Dragon GWE Telegram Bot",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "node-telegram-bot-api": "^0.64.0",
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "node-cron": "^3.0.3"
  },
  "engines": {
    "node": "18.x"
  }
}
EOF

echo "Creating index.js..."
# Download the index.js file or copy it
echo "Downloading bot code..."
curl -o index.js https://raw.githubusercontent.com/your-repo/main/index.js 2>/dev/null || echo "Please copy index.js manually"

echo "Creating .gitignore..."
cat > .gitignore << 'EOF'
node_modules/
.env
*.log
.DS_Store
EOF

echo "✅ Files created!"
echo "📁 Next steps:"
echo "1. Copy the index.js code into the file"
echo "2. Run: git init && git add . && git commit -m 'Initial commit'"
echo "3. Push to GitHub"
echo "4. Deploy on Render.com"
