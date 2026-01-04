# VEGA E-Commerce - Deployment Script
# Run this script to deploy your website to Firebase Hosting

Write-Host "🚀 VEGA E-Commerce Deployment Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Firebase Login
Write-Host "Step 1: Logging into Firebase..." -ForegroundColor Yellow
firebase login
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Firebase login failed. Please try again." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Successfully logged into Firebase!" -ForegroundColor Green
Write-Host ""

# Step 2: Initialize Firebase (if needed)
Write-Host "Step 2: Checking Firebase initialization..." -ForegroundColor Yellow
if (-not (Test-Path ".firebaserc")) {
    Write-Host "Initializing Firebase project..." -ForegroundColor Yellow
    firebase use vega-fashion-28ae3
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to set Firebase project. Please check project ID." -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Firebase project configured!" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy Firestore Rules
Write-Host "Step 3: Deploying Firestore security rules..." -ForegroundColor Yellow
firebase deploy --only firestore:rules
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy Firestore rules." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Firestore security rules deployed!" -ForegroundColor Green
Write-Host ""

# Step 4: Deploy Website
Write-Host "Step 4: Deploying website to Firebase Hosting..." -ForegroundColor Yellow
firebase deploy --only hosting
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy website." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Website deployed successfully!" -ForegroundColor Green
Write-Host ""

# Success Message
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your website is now live at:" -ForegroundColor Cyan
Write-Host "https://vega-fashion-28ae3.web.app" -ForegroundColor White
Write-Host "https://vega-fashion-28ae3.firebaseapp.com" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Visit your website and test all features" -ForegroundColor White
Write-Host "2. Test the review moderation system" -ForegroundColor White
Write-Host "3. Verify security rules are working" -ForegroundColor White
Write-Host "4. (Optional) Add a custom domain in Firebase Console" -ForegroundColor White
Write-Host ""
