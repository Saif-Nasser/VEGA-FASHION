# VEGA E-Commerce - Cloudflare Tunnel Deployment
# Quick deployment with free public URL using Cloudflare Tunnel

Write-Host "🚀 VEGA - Cloudflare Tunnel Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if cloudflared is installed
Write-Host "Checking for Cloudflare Tunnel (cloudflared)..." -ForegroundColor Yellow
$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue

if (-not $cloudflared) {
    Write-Host "Installing Cloudflare Tunnel..." -ForegroundColor Yellow
    
    # Download cloudflared
    $downloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    $outputPath = "$env:TEMP\cloudflared.exe"
    
    Write-Host "Downloading cloudflared..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $downloadUrl -OutFile $outputPath
    
    # Move to a permanent location
    $installPath = "$env:LOCALAPPDATA\cloudflared"
    if (-not (Test-Path $installPath)) {
        New-Item -ItemType Directory -Path $installPath -Force | Out-Null
    }
    
    Move-Item -Path $outputPath -Destination "$installPath\cloudflared.exe" -Force
    
    # Add to PATH for current session
    $env:Path += ";$installPath"
    
    Write-Host "✅ Cloudflared installed!" -ForegroundColor Green
}
else {
    Write-Host "✅ Cloudflared already installed!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting local web server..." -ForegroundColor Yellow

# Start Python HTTP server in background
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    python -m http.server 8080
}

Write-Host "✅ Web server started on port 8080" -ForegroundColor Green
Write-Host ""

# Wait a moment for server to start
Start-Sleep -Seconds 2

Write-Host "Creating Cloudflare Tunnel..." -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 Your website will be available at a public URL in a moment..." -ForegroundColor Cyan
Write-Host ""

# Start cloudflared tunnel
try {
    cloudflared tunnel --url http://localhost:8080
}
finally {
    # Cleanup
    Write-Host ""
    Write-Host "Stopping web server..." -ForegroundColor Yellow
    Stop-Job -Job $serverJob
    Remove-Job -Job $serverJob
    Write-Host "✅ Cleanup complete!" -ForegroundColor Green
}
