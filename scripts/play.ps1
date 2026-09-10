$ErrorActionPreference = 'Stop'
$gameRoot = Split-Path -Parent $PSScriptRoot
$gameUrl = 'http://localhost:5173'
$gameReady = $false
try {
  $gameResponse = Invoke-WebRequest -Uri $gameUrl -UseBasicParsing -TimeoutSec 2
  $gameReady = $gameResponse.Content -match '<title>CookingDual'
  if (-not $gameReady) { throw 'Port 5173 is already used by a different application.' }
} catch [System.Net.WebException] {
  $gameReady = $false
}
if (-not $gameReady) {
  if (-not (Test-Path -LiteralPath (Join-Path $gameRoot 'node_modules/ws/package.json'))) {
    Push-Location -LiteralPath $gameRoot
    try {
      & npm.cmd ci --omit=dev --cache .npm-cache
      if ($LASTEXITCODE -ne 0) { throw 'Could not install the multiplayer dependency. Check the Internet connection and try again.' }
    } finally { Pop-Location }
  }
  $gameNode = (Get-Command node.exe -ErrorAction Stop).Source
  $gameServer = Join-Path $gameRoot 'server.mjs'
  Start-Process -FilePath $gameNode -ArgumentList @('"' + $gameServer + '"') -WorkingDirectory $gameRoot -WindowStyle Hidden
  for ($gameAttempt = 0; $gameAttempt -lt 25; $gameAttempt++) {
    Start-Sleep -Milliseconds 200
    try {
      $gameResponse = Invoke-WebRequest -Uri $gameUrl -UseBasicParsing -TimeoutSec 1
      if ($gameResponse.Content -match '<title>CookingDual') { $gameReady = $true; break }
    } catch { }
  }
}
if ($gameReady) { Start-Process $gameUrl }
else { throw 'CookingDual could not start. Run npm start in the CookingDual folder.' }
