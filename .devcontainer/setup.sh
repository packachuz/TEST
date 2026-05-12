#!/bin/bash
set -e

# Start PostgreSQL
sudo service postgresql start
sleep 2

# Create DB and user
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" 2>/dev/null || true
sudo -u postgres createdb erp 2>/dev/null || true

# Write .env.local for Next.js
cat > /workspaces/TEST/erp/.env.local <<EOF
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="codespaces-dev-secret-change-in-prod"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
EOF

# Install Node dependencies
cd /workspaces/TEST/erp
npm install

# Push Prisma schema to DB
npx prisma db push

# Seed default data (tenant + admin user + GL accounts)
node /workspaces/TEST/.devcontainer/seed.js

# Install Python dependencies for NotebookLM integration
if command -v pip3 &>/dev/null; then
  pip3 install --quiet notebooklm-py
elif command -v pip &>/dev/null; then
  pip install --quiet notebooklm-py
else
  sudo apt-get install -y -q python3-pip 2>/dev/null && pip3 install --quiet notebooklm-py
fi

echo ""
echo "✅ ERP setup complete. Run 'cd erp && npm run dev' to start."
echo "   Note: set ANTHROPIC_API_KEY in Codespace secrets for the HR AI Agent."
echo "   Note: run 'notebooklm login' to authenticate the NotebookLM integration."
