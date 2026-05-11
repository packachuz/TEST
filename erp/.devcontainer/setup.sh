#!/bin/bash
set -e

echo "=== Installing dependencies ==="
npm install

echo "=== Waiting for PostgreSQL ==="
until pg_isready -U postgres -q; do sleep 1; done

echo "=== Creating database ==="
psql -U postgres -c "CREATE DATABASE erp_dev;" 2>/dev/null || echo "Database already exists"
psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || true

echo "=== Running migrations ==="
npx prisma migrate deploy

echo "=== Generating Prisma client ==="
npx prisma generate

echo "=== Seeding database ==="
npm run db:seed

echo ""
echo "✅ Setup complete!"
echo "   Run: npm run dev"
echo "   Open: http://localhost:3000"
echo "   Login: slug=demo | admin@demo.com | demo1234"
