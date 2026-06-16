# PowerShell Deployment Script (implementing Rule #10)
# Usage: .\deploy.ps1 -Mode production (or -M production, -m development, etc.)

param (
    [Parameter(Mandatory=$false)]
    [Alias("M", "m")]
    [ValidateSet("development", "dev", "production", "prod")]
    [string]$Mode = "development"
)

# Canonicalize mode
if ($Mode -eq "dev") { $Mode = "development" }
if ($Mode -eq "prod") { $Mode = "production" }

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "CMS Platform Deployment Script" -ForegroundColor Cyan
Write-Host "Target Mode: $Mode" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Resolve configurations
$EnvFile = ""
if ($Mode -eq "production") {
    $EnvFile = "config/.env.prod"
    $NodeEnv = "production"
} else {
    $EnvFile = "config/.env.dev"
    $NodeEnv = "development"
}

# 2. Spin up infrastructure services if needed (via Docker)
Write-Host "[1/4] Checking local MongoDB & Redis containers..." -ForegroundColor Green
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Docker compose failed. Make sure Docker is running if you want local DB services." -ForegroundColor Yellow
}

# 3. Resolve & Install Dependencies
Write-Host "[2/4] Installing dependencies across components..." -ForegroundColor Green

$Directories = @("server", "landing-page", "user-portal", "admin-portal")
foreach ($Dir in $Directories) {
    Write-Host "   Installing dependencies in: $Dir..." -ForegroundColor DarkCyan
    Push-Location $Dir
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: npm install failed in $Dir" -ForegroundColor Red
        Pop-Location
        Exit 1
    }
    Pop-Location
}

# 4. Frontend Compilations (Production Build)
if ($Mode -eq "production") {
    Write-Host "[3/4] Compiling frontends for production..." -ForegroundColor Green
    $Frontends = @("landing-page", "user-portal", "admin-portal")
    foreach ($Fe in $Frontends) {
        Write-Host "   Building frontend: $Fe..." -ForegroundColor DarkCyan
        Push-Location $Fe
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: Build failed in $Fe" -ForegroundColor Red
            Pop-Location
            Exit 1
        }
        Pop-Location
    }
} else {
    Write-Host "[3/4] Skipping production frontend compilation (Development Mode)..." -ForegroundColor Yellow
}

# 5. Starting Services
Write-Host "[4/4] Setup complete!" -ForegroundColor Green
if ($Mode -eq "production") {
    Write-Host "To run the production environment:" -ForegroundColor Cyan
    Write-Host "  Backend: cd server && npm run prod" -ForegroundColor White
    Write-Host "  Frontends: Run 'npm run start' inside landing-page, user-portal, and admin-portal" -ForegroundColor White
} else {
    Write-Host "To run the development environment:" -ForegroundColor Cyan
    Write-Host "  Backend: cd server && npm run dev" -ForegroundColor White
    Write-Host "  Landing Page: cd landing-page && npm run dev" -ForegroundColor White
    Write-Host "  User Portal: cd user-portal && npm run dev" -ForegroundColor White
    Write-Host "  Admin Portal: cd admin-portal && npm run dev" -ForegroundColor White
}
Write-Host "==================================================" -ForegroundColor Cyan
