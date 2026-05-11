#!/bin/bash
set -e

echo "=== Installing dependencies ==="
npm install

echo "=== Waiting for PostgreSQL ==="
until pg_isready -U postgres -q; do sleep 1; done

echo "=== Creating database ==="
psql -U postgres -c "CREATE DATABASE erp_dev;" 2>/dev/null || echo "Database already exists"
psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || true

echo "=== Configuring environment ==="
# Detect Codespaces URL and set NEXTAUTH_URL accordingly
if [ -n "$CODESPACE_NAME" ] && [ -n "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ]; then
  NEXTAUTH_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  echo "Detected Codespaces URL: $NEXTAUTH_URL"
else
  NEXTAUTH_URL="http://localhost:3000"
fi

cat > .env.local <<EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/erp_dev
NEXTAUTH_SECRET=codespaces-dev-secret-change-in-prod
NEXTAUTH_URL=${NEXTAUTH_URL}
EOF
echo ".env.local written"

echo "=== Running migrations ==="
npx prisma migrate deploy

echo "=== Generating Prisma client ==="
npx prisma generate

echo "=== Seeding database ==="
npm run db:seed

echo ""
echo "✅ Setup complete!"
echo "   Run: npm run dev"
echo "   Login: slug=demo | admin@demo.com | demo1234"
