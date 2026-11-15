#!/bin/sh
# Migraciones y seeds de ambas bases. Todo es idempotente: se puede ejecutar en cada despliegue.
set -eu

: "${USERS_DB:=users_db}"
: "${PRODUCTS_DB:=products_db}"

echo "==> Migraciones de $USERS_DB"
DB_DATABASE="$USERS_DB" pnpm migration:users:run

echo "==> Migraciones de $PRODUCTS_DB"
DB_DATABASE="$PRODUCTS_DB" pnpm migration:products:run

echo "==> Seed: roles"
DB_DATABASE="$USERS_DB" pnpm seed:users

if [ "${SEED_DEMO_USERS:-false}" = "true" ]; then
  echo "==> Seed: usuarios de demostración"
  DB_DATABASE="$USERS_DB" pnpm seed:demo-users
fi

if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  echo "==> Seed: administrador $ADMIN_EMAIL"
  DB_DATABASE="$USERS_DB" pnpm seed:admin
fi

echo "==> Seed: categorías y productos"
DB_DATABASE="$PRODUCTS_DB" pnpm seed:products

echo "==> Base de datos lista"
