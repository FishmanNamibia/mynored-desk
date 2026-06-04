#!/bin/bash
# Deployment Script for NSA Desk to Server 172.16.192.216
# This script deploys YOUR performance management module

echo "🚀 Starting deployment of NSA Desk to 172.16.192.216..."
echo "📋 Deploying from branch: deploy/your-performance-module-2026-02-10"

# Variables
SERVER_IP="172.16.192.216"
SERVER_USER="your_username"  # Change this to actual server username
DEPLOY_PATH="/opt/nsa-desk"
BACKUP_PATH="/opt/nsa-desk-backups/$(date +%Y%m%d_%H%M%S)"

echo "📦 Creating deployment package..."

# Create deployment directory
mkdir -p deployment-package
cd deployment-package

# Copy necessary files
echo "📋 Copying application files..."
cp -r ../apps ../packages ../docker ../scripts ../turbo.json ../package.json ../pnpm-workspace.yaml ../pnpm-lock.yaml .

# Create production environment template
echo "⚙️ Creating environment template..."
cat > .env.production.template << 'EOF'
# Production Environment Variables for NSA Desk
# Server: 172.16.192.216
# Copy this file to .env.production and fill in actual values

# Database Configuration
DATABASE_URL=postgresql://postgres:CHANGE_THIS_PASSWORD@localhost:5432/nsa_desk_prod
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CHANGE_THIS_PASSWORD
POSTGRES_DB=nsa_desk_prod

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Next.js Configuration
NODE_ENV=production
NEXTAUTH_URL=http://172.16.192.216:3080
NEXTAUTH_SECRET=CHANGE_THIS_SECRET_KEY

# Microsoft Entra ID Configuration
MICROSOFT_CLIENT_ID=your_azure_client_id_here
MICROSOFT_CLIENT_SECRET=your_azure_client_secret_here
MICROSOFT_TENANT_ID=your_azure_tenant_id_here

# API Configuration
NEXT_PUBLIC_API_URL=http://172.16.192.216:34567
API_PORT=34567
WEB_PORT=3080

# File Upload Configuration
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL=info
EOF

# Create deployment script for server
cat > deploy-on-server.sh << 'EOF'
#!/bin/bash
# Server-side deployment script

echo "🔧 Setting up NSA Desk on server..."

# Install dependencies if needed
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create directories
sudo mkdir -p /opt/nsa-desk/{uploads,logs}
sudo chown -R $USER:$USER /opt/nsa-desk

# Setup environment
if [ ! -f .env.production ]; then
    echo "⚙️ Please configure .env.production from template:"
    cp .env.production.template .env.production
    echo "Edit .env.production with your actual values, then run this script again."
    exit 1
fi

# Build and start services
echo "🏗️ Building and starting services..."
docker-compose -f docker/docker-compose.yml down
docker-compose -f docker/docker-compose.yml build
docker-compose -f docker/docker-compose.yml up -d

echo "✅ Deployment complete!"
echo "🌐 Frontend: http://172.16.192.216:3080"
echo "🔧 Backend API: http://172.16.192.216:34567"
echo "📊 Health Check: http://172.16.192.216:34567/api/health"
EOF

chmod +x deploy-on-server.sh

# Create package
echo "📦 Creating deployment package..."
tar -czf nsa-desk-deployment-$(date +%Y%m%d_%H%M%S).tar.gz .

echo "✅ Deployment package created!"
echo "📋 Next steps:"
echo "1. Copy the .tar.gz file to server 172.16.192.216"
echo "2. Extract and run deploy-on-server.sh"
echo "3. Configure .env.production with actual values"
echo "4. Run docker-compose up -d"
