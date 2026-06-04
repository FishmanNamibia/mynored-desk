#!/bin/bash
# ============================================================
# MyNSA Desk - Production Deployment Script
# App Server: 172.16.192.216
# DB Server:  172.16.192.63
# ============================================================

set -e

APP_DIR="/home/afanuel/my_nsa_desk"
REPO_URL="https://github.com/Namibia-Statistics-Agency-NHIS/my_nsa_desk.git"
SERVER_IP="172.16.192.216"

require_env() {
  local var_name="$1"
  if [ -z "${!var_name}" ]; then
    echo "Missing required environment variable: $var_name"
    exit 1
  fi
}

echo "=========================================="
echo "  MyNSA Desk - Deployment Starting"
echo "=========================================="

# Step 1: Install system dependencies
echo ""
echo "[1/7] Installing system dependencies..."
sudo apt-get update -y
sudo apt-get install -y nginx

# Step 2: Install pnpm and pm2 globally
echo ""
echo "[2/7] Installing pnpm and pm2..."
sudo npm install -g pnpm pm2

# Step 3: Clone or update the repository
echo ""
echo "[3/7] Setting up repository..."
if [ -d "$APP_DIR" ]; then
  echo "Repository exists, pulling latest..."
  cd "$APP_DIR"
  git pull origin main
else
  echo "Cloning repository..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# Step 4: Create .env for NestJS API (apps/api uses root .env)
echo ""
echo "[4/7] Configuring environment variables..."
require_env "DATABASE_URL"
require_env "JWT_SECRET"
require_env "SESSION_SECRET"
require_env "REDIS_PASSWORD"
require_env "AZURE_TENANT_ID"
require_env "AZURE_CLIENT_ID"
require_env "AZURE_CLIENT_SECRET"
require_env "AZURE_API_CLIENT_ID"

: "${JWT_EXPIRES_IN:=7d}"
: "${REDIS_URL:=redis://172.16.192.63:6379}"
: "${NODE_ENV:=production}"
: "${API_PORT:=34567}"
: "${WEB_PORT:=3080}"
: "${COOKIE_DOMAIN:=$SERVER_IP}"
: "${API_URL:=http://$SERVER_IP:34567}"
: "${WEB_URL:=http://$SERVER_IP:3080}"
: "${EMAIL_HOST:=smtp.office365.com}"
: "${EMAIL_PORT:=587}"
: "${EMAIL_SECURE:=false}"
: "${EMAIL_USER:=noreply@nsa.org.na}"
: "${EMAIL_PASSWORD:=}"
: "${EMAIL_FROM:=MyNSA Desk <noreply@nsa.org.na>}"
: "${UPLOAD_PATH:=./uploads}"
: "${MAX_FILE_SIZE:=10485760}"
: "${ALLOWED_FILE_TYPES:=pdf,doc,docx,xls,xlsx,png,jpg,jpeg}"
: "${LOG_LEVEL:=info}"
: "${LOG_FILE:=./logs/app.log}"
: "${QUEUE_REDIS_URL:=redis://172.16.192.63:6379}"
: "${DEFAULT_SLA_DURATION:=24}"
: "${DEFAULT_ESCALATION_DURATION:=48}"
: "${SESSION_MAX_AGE:=604800000}"
: "${CORS_ORIGIN:=$WEB_URL}"
: "${AZURE_ISSUER:=https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0}"
: "${OLLAMA_BASE_URL:=http://localhost:11434}"
: "${OLLAMA_DEFAULT_MODEL:=llama3.2}"
: "${OLLAMA_MAX_TOKENS:=2048}"
: "${OLLAMA_TEMPERATURE:=0.7}"
: "${OLLAMA_CONTEXT_WINDOW:=4096}"
: "${OLLAMA_TIMEOUT_MS:=30000}"

cat > "$APP_DIR/.env" << ENVFILE
# Database
DATABASE_URL="${DATABASE_URL}"

# JWT & Auth
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN="${JWT_EXPIRES_IN}"

# Redis
REDIS_URL="${REDIS_URL}"
REDIS_PASSWORD="${REDIS_PASSWORD}"

# Application
NODE_ENV="${NODE_ENV}"
API_PORT=${API_PORT}
WEB_PORT=${WEB_PORT}
COOKIE_DOMAIN=${COOKIE_DOMAIN}

# URLs
API_URL="${API_URL}"
WEB_URL="${WEB_URL}"

# Email (SMTP)
EMAIL_HOST="${EMAIL_HOST}"
EMAIL_PORT=${EMAIL_PORT}
EMAIL_SECURE=${EMAIL_SECURE}
EMAIL_USER="${EMAIL_USER}"
EMAIL_PASSWORD="${EMAIL_PASSWORD}"
EMAIL_FROM="${EMAIL_FROM}"

# File Storage
UPLOAD_PATH="${UPLOAD_PATH}"
MAX_FILE_SIZE=${MAX_FILE_SIZE}
ALLOWED_FILE_TYPES="${ALLOWED_FILE_TYPES}"

# Logging
LOG_LEVEL="${LOG_LEVEL}"
LOG_FILE="${LOG_FILE}"

# Background Jobs
QUEUE_REDIS_URL="${QUEUE_REDIS_URL}"

# SLA Settings (in hours)
DEFAULT_SLA_DURATION=${DEFAULT_SLA_DURATION}
DEFAULT_ESCALATION_DURATION=${DEFAULT_ESCALATION_DURATION}

# Session
SESSION_SECRET="${SESSION_SECRET}"
SESSION_MAX_AGE=${SESSION_MAX_AGE}

# Cors
CORS_ORIGIN="${CORS_ORIGIN}"

# Azure Entra ID Configuration (Backend)
AZURE_TENANT_ID=${AZURE_TENANT_ID}
AZURE_CLIENT_ID=${AZURE_CLIENT_ID}
AZURE_CLIENT_SECRET=${AZURE_CLIENT_SECRET}
AZURE_ISSUER=${AZURE_ISSUER}
AZURE_API_CLIENT_ID=${AZURE_API_CLIENT_ID}

# Ollama AI
OLLAMA_BASE_URL="${OLLAMA_BASE_URL}"
OLLAMA_DEFAULT_MODEL="${OLLAMA_DEFAULT_MODEL}"
OLLAMA_MAX_TOKENS=${OLLAMA_MAX_TOKENS}
OLLAMA_TEMPERATURE=${OLLAMA_TEMPERATURE}
OLLAMA_CONTEXT_WINDOW=${OLLAMA_CONTEXT_WINDOW}
OLLAMA_TIMEOUT_MS=${OLLAMA_TIMEOUT_MS}
ENVFILE

# Create .env.local for Next.js frontend
: "${NEXT_PUBLIC_API_URL:=$API_URL}"
: "${NEXT_PUBLIC_AZURE_CLIENT_ID:=$AZURE_CLIENT_ID}"
: "${NEXT_PUBLIC_AZURE_TENANT_ID:=$AZURE_TENANT_ID}"
: "${NEXT_PUBLIC_AZURE_REDIRECT_URI:=$WEB_URL/auth/entra}"
: "${NEXT_PUBLIC_AZURE_POST_LOGOUT_REDIRECT_URI:=$WEB_URL/}"
: "${NEXT_PUBLIC_AZURE_API_SCOPE:=${AZURE_API_CLIENT_ID}/access_as_user}"
: "${AZURE_AUTHORIZATION_ENDPOINT:=https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/authorize}"
: "${AZURE_TOKEN_ENDPOINT:=https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token}"

cat > "$APP_DIR/apps/web/.env.local" << ENVFILE
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
NEXT_PUBLIC_AZURE_CLIENT_ID=${NEXT_PUBLIC_AZURE_CLIENT_ID}
NEXT_PUBLIC_AZURE_TENANT_ID=${NEXT_PUBLIC_AZURE_TENANT_ID}
NEXT_PUBLIC_AZURE_REDIRECT_URI=${NEXT_PUBLIC_AZURE_REDIRECT_URI}
NEXT_PUBLIC_AZURE_POST_LOGOUT_REDIRECT_URI=${NEXT_PUBLIC_AZURE_POST_LOGOUT_REDIRECT_URI}
NEXT_PUBLIC_AZURE_API_SCOPE=${NEXT_PUBLIC_AZURE_API_SCOPE}
AZURE_AUTHORIZATION_ENDPOINT=${AZURE_AUTHORIZATION_ENDPOINT}
AZURE_TOKEN_ENDPOINT=${AZURE_TOKEN_ENDPOINT}
ENVFILE

echo "Environment files created."

# Step 5: Install dependencies and generate Prisma client
echo ""
echo "[5/7] Installing dependencies and building..."
cd "$APP_DIR"
pnpm install

# Generate Prisma client
cd "$APP_DIR/packages/database"
npx prisma generate
cd "$APP_DIR"

# Build NestJS API
echo "Building NestJS API..."
cd "$APP_DIR/apps/api"
pnpm build

# Build Next.js frontend
echo "Building Next.js frontend..."
cd "$APP_DIR/apps/web"
pnpm build

# Step 6: Set up PM2 process manager
echo ""
echo "[6/7] Setting up PM2..."
cd "$APP_DIR"

# Create PM2 ecosystem config
cat > "$APP_DIR/ecosystem.config.js" << 'PM2FILE'
module.exports = {
  apps: [
    {
      name: 'mynsa-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 34567,
      },
    },
    {
      name: 'mynsa-web',
      cwd: './apps/web',
      script: 'node_modules/.bin/next',
      args: 'start --port 3080',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3080,
      },
    },
  ],
}
PM2FILE

# Stop existing processes if any
pm2 delete all 2>/dev/null || true

# Start both apps
pm2 start ecosystem.config.js

# Save PM2 process list and set up startup
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u afanuel --hp /home/afanuel

# Step 7: Configure Nginx reverse proxy
echo ""
echo "[7/7] Configuring Nginx..."
sudo tee /etc/nginx/sites-available/mynsa-desk << 'NGINXCONF'
server {
    listen 80;
    server_name 172.16.192.216;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API (NestJS)
    location /api/ {
        proxy_pass http://127.0.0.1:34567/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXCONF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/mynsa-desk /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "  App URL:  http://172.16.192.216"
echo "  API URL:  http://172.16.192.216/api"
echo ""
echo "  PM2 Status: pm2 status"
echo "  PM2 Logs:   pm2 logs"
echo ""
echo "  IMPORTANT: Update Azure App Registration:"
echo "  - Add redirect URI: http://172.16.192.216:3080/auth/entra"
echo "  - Add logout URI:   http://172.16.192.216:3080/"
echo "=========================================="
