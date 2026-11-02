#requires -Version 7.0
param([switch]$Sync)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$canonicalRoot = Join-Path $projectRoot '.agents/skills'
$claudeRoot = Join-Path $projectRoot '.claude/skills'
$manifest = Get-Content -LiteralPath (Join-Path $canonicalRoot 'gamedev-lock.json') -Raw | ConvertFrom-Json

# Only the reviewed seven skills are copied. No downloads, execution of upstream
# scripts, recursive removals, or changes to user-global agent settings.
$expectedNames = @('create-game-assets','game-ai','level-design','game-feel','game-ui-ux','performance-optimization','phaser-core')
if ((@($manifest.skills.name | Sort-Object) -join ',') -ne (($expectedNames | Sort-Object) -join ',')) {
    throw 'The skill manifest must contain exactly the seven approved skills.'
}

$checkedFiles = 0
foreach ($skill in $manifest.skills) {
    $sourceFolder = Join-Path $canonicalRoot $skill.name
    $targetFolder = Join-Path $claudeRoot $skill.name
    $recordedPaths = @($skill.files.path | Sort-Object)
    $actualPaths = @(Get-ChildItem -LiteralPath $sourceFolder -Recurse -File | ForEach-Object {
        [IO.Path]::GetRelativePath($sourceFolder, $_.FullName).Replace('\','/')
    } | Sort-Object)
    if (($actualPaths -join '|') -ne ($recordedPaths -join '|')) {
        throw "Canonical file inventory differs from the pinned manifest: $($skill.name)"
    }
    foreach ($file in $skill.files) {
        $relativeFile = [string]$file.path
        if ([IO.Path]::IsPathRooted($relativeFile) -or ($relativeFile -split '[/\\]') -contains '..') {
            throw "Invalid relative skill file path: $relativeFile"
        }
        $source = Join-Path $sourceFolder $relativeFile
        $target = Join-Path $targetFolder $relativeFile
        if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256) {
            throw "Canonical content differs from the pinned manifest: $($skill.name)/$relativeFile"
        }
        if ($Sync) {
            New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
            Copy-Item -LiteralPath $source -Destination $target
        }
        if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
            throw "Missing Claude copy: $($skill.name)/$relativeFile. Run this script with -Sync."
        }
        if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256) {
            throw "Claude copy differs from canonical content: $($skill.name)/$relativeFile"
        }
        $checkedFiles++
    }
    $targetPaths = @(Get-ChildItem -LiteralPath $targetFolder -Recurse -File | ForEach-Object {
        [IO.Path]::GetRelativePath($targetFolder, $_.FullName).Replace('\','/')
    } | Sort-Object)
    if (($targetPaths -join '|') -ne ($recordedPaths -join '|')) {
        throw "Unexpected files in Claude copy: $($skill.name). Reconcile the copy before continuing."
    }
}
if ($Sync) {
    foreach ($name in @('LICENSE.gamedev.txt','NOTICE.gamedev.txt','gamedev-lock.json')) {
        Copy-Item -LiteralPath (Join-Path $canonicalRoot $name) -Destination (Join-Path $claudeRoot $name)
    }
}
Write-Output "PASS: seven pinned game-development skills; $checkedFiles canonical files and identical Claude copies."
