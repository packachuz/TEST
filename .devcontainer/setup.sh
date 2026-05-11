#!/bin/bash
set -e

# Start PostgreSQL
sudo service postgresql start
sleep 2

# Create DB and user
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" 2>/dev/null || true
sudo -u postgres createdb erp 2>/dev/null || true

# Write .env.local for Next.js
cat > /workspaces/TEST/erp/.env.local <<'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="codespaces-dev-secret-change-in-prod"
EOF

# Install dependencies
cd /workspaces/TEST/erp
npm install

# Push Prisma schema to DB
npx prisma db push

# Seed default data (tenant + admin user + GL accounts)
node .devcontainer/seed.js

echo ""
echo "✅ ERP setup complete. Run 'cd erp && npm run dev' to start."
