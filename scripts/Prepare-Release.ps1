param(
    [string]$Version = "1.0.0",
    [string]$SourceDir = "..\DataCenterPublishOut",
    [string]$OutDir = ".\dist",
    [string]$Channel = "stable"
)

$ErrorActionPreference = "Stop"

$source = Resolve-Path $SourceDir
$dist = Join-Path (Get-Location) $OutDir
New-Item -ItemType Directory -Force -Path $dist | Out-Null

$zipName = "tiancaimao-datacenter-$Version.zip"
$zipPath = Join-Path $dist $zipName
if (Test-Path $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

$stage = Join-Path ([System.IO.Path]::GetTempPath()) ("dy-release-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $stage | Out-Null
try {
    $excluded = @("DataCenter", "Logs", "*.log")
    Get-ChildItem -LiteralPath $source -Force |
        Where-Object {
            $name = $_.Name
            -not ($excluded | Where-Object { $name -like $_ })
        } |
        Copy-Item -Destination $stage -Recurse -Force

    Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zipPath -CompressionLevel Optimal
}
finally {
    if (Test-Path $stage) {
        Remove-Item -LiteralPath $stage -Recurse -Force
    }
}

$hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
$size = "{0:N2} MB" -f ((Get-Item -LiteralPath $zipPath).Length / 1MB)

$manifest = [ordered]@{
    product = "TianCaiMao Live Data Management"
    latest = "datacenter-$Version"
    releases = @(
        [ordered]@{
            id = "datacenter-$Version"
            channel = $Channel
            name = "Data Center Standalone"
            version = $Version
            date = (Get-Date -Format "yyyy-MM-dd")
            key = "releases/$zipName"
            fileName = "TianCaiMao-DataCenter-$Version.zip"
            size = $size
            sha256 = $hash
            notes = @(
                "System settings support data backup and report import/export.",
                "Data management supports admin-password protected editing and image patching.",
                "Relay edits recalculate linked sessions and show confirmation dialogs."
            )
        }
    )
}

$manifestPath = Join-Path $dist "manifest.json"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 8), $utf8NoBom)

Write-Host "Release package:" $zipPath
Write-Host "Manifest:" $manifestPath
Write-Host "SHA256:" $hash
Write-Host ""
Write-Host "Upload commands:"
Write-Host "npx wrangler r2 object put dy-ldms-downloads/releases/$zipName --file `"$zipPath`""
Write-Host "npx wrangler r2 object put dy-ldms-downloads/releases/manifest.json --file `"$manifestPath`""
