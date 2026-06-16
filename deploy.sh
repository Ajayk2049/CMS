#!/bin/bash
# Shell Deployment Script (implementing Rule #10)
# Usage: ./deploy.sh -m production (or -M production, -m development, etc.)

MODE="development"

# Parse parameters
while getopts "m:M:-:" opt; do
  case "$opt" in
    m|M)
      MODE=$OPTARG
      ;;
    -)
      case "${OPTARG}" in
        mode)
          val="${!OPTIND}"; OPTIND=$(( $OPTIND + 1 ))
          MODE=$val
          ;;
        mode=*)
          MODE=${OPTARG#*=}
          ;;
        *)
          echo "Unknown option --${OPTARG}" >&2
          exit 1
          ;;
      esac
      ;;
    \?)
      echo "Invalid option -$OPTARG" >&2
      exit 1
      ;;
  esac
done

# Canonicalize mode
if [ "$MODE" = "dev" ]; then MODE="development"; fi
if [ "$MODE" = "prod" ]; then MODE="production"; fi

echo "=================================================="
echo "CMS Platform Deployment Script"
echo "Target Mode: $MODE"
echo "=================================================="

# 1. Resolve configurations
if [ "$MODE" = "production" ]; then
  ENV_FILE="config/.env.prod"
  NODE_ENV="production"
else
  ENV_FILE="config/.env.dev"
  NODE_ENV="development"
fi

# 2. Spin up local database and cache (via Docker)
echo "[1/4] Checking local MongoDB & Redis containers..."
docker compose up -d
if [ $? -ne 0 ]; then
  echo "Warning: Docker compose failed. Make sure Docker is running if you want local DB services."
fi

# 3. Resolve & Install Dependencies
echo "[2/4] Installing dependencies across components..."
DIRS=("server" "landing-page" "user-portal" "admin-portal")
for dir in "${DIRS[@]}"; do
  echo "   Installing dependencies in: $dir..."
  cd "$dir" || exit 1
  npm install
  if [ $? -ne 0 ]; then
    echo "Error: npm install failed in $dir"
    exit 1
  fi
  cd ..
done

# 4. Frontend Compilations (Production Build)
if [ "$MODE" = "production" ]; then
  echo "[3/4] Compiling frontends for production..."
  FRONTENDS=("landing-page" "user-portal" "admin-portal")
  for fe in "${FRONTENDS[@]}"; do
    echo "   Building frontend: $fe..."
    cd "$fe" || exit 1
    npm run build
    if [ $? -ne 0 ]; then
      echo "Error: Build failed in $fe"
      exit 1
    fi
    cd ..
  done
else
  echo "[3/4] Skipping production frontend compilation (Development Mode)..."
fi

# 5. Starting Services
echo "[4/4] Setup complete!"
if [ "$MODE" = "production" ]; then
  echo "To run the production environment:"
  echo "  Backend: cd server && npm run prod"
  echo "  Frontends: Run 'npm run start' inside landing-page, user-portal, and admin-portal"
else
  echo "To run the development environment:"
  echo "  Backend: cd server && npm run dev"
  echo "  Landing Page: cd landing-page && npm run dev"
  echo "  User Portal: cd user-portal && npm run dev"
  echo "  Admin Portal: cd admin-portal && npm run dev"
fi
echo "=================================================="
