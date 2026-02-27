# نسخة احتياطية مضغوطة من المشروع (بدون node_modules)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$date = Get-Date -Format 'yyyyMMdd-HHmm'
$dest = Join-Path $scriptDir "whatsapp-clone-backup-$date.zip"

$toInclude = @()
if (Test-Path "src") { $toInclude += "src" }
if (Test-Path "public") { $toInclude += "public" }
if (Test-Path "config") { $toInclude += "config" }
if (Test-Path "package.json") { $toInclude += "package.json" }
if (Test-Path "package-lock.json") { $toInclude += "package-lock.json" }
if (Test-Path ".env.example") { $toInclude += ".env.example" }
if (Test-Path "create-backup.ps1") { $toInclude += "create-backup.ps1" }
if (Test-Path "render.yaml") { $toInclude += "render.yaml" }
if (Test-Path "uploads") { $toInclude += "uploads" }
# لا تضف .env (يحتوي على بيانات حساسة) - انسخه يدوياً إذا احتجت

Compress-Archive -Path $toInclude -DestinationPath $dest -Force
Write-Host "تم إنشاء النسخة الاحتياطية: $dest"
Get-Item $dest | Select-Object Name, Length
