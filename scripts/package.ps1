$ErrorActionPreference = 'Stop'
$packageRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$packageOutput = Join-Path $packageRoot 'artifacts/CookingDual-web.zip'
[IO.Directory]::CreateDirectory((Split-Path -Parent $packageOutput)) | Out-Null
$packageFiles = @('package.json','package-lock.json','server.mjs','index.html','publish.html','favicon.svg','manifest.webmanifest','render.yaml','Dockerfile','.dockerignore','.gitignore','README.md','DEPLOY.md','DESIGN.md','Choi-CookingDual.cmd') | ForEach-Object { Get-Item -LiteralPath (Join-Path $packageRoot $_) }
foreach ($packageDirectory in @('src','vendor','scripts','tests','assets')) {
  $packageFiles += Get-ChildItem -LiteralPath (Join-Path $packageRoot $packageDirectory) -File -Recurse | Where-Object { $_.Extension -ne '.blend1' }
}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$packageStream = [IO.File]::Open($packageOutput,[IO.FileMode]::Create)
$packageArchive = [IO.Compression.ZipArchive]::new($packageStream,[IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($packageFile in $packageFiles) {
    $packagePath = [IO.Path]::GetFullPath($packageFile.FullName)
    if (-not $packagePath.StartsWith($packageRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Package path is outside the project.' }
    $packageRelative = $packagePath.Substring($packageRoot.Length + 1).Replace('\','/')
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($packageArchive,$packagePath,$packageRelative,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally { $packageArchive.Dispose();$packageStream.Dispose() }
Get-Item -LiteralPath $packageOutput | Select-Object FullName,Length
