# 一次性脚本：把腾讯云镜像已下载完整的 Gradle 8.14.3 缓存复制到官方地址的缓存目录，
# 使 wrapper 无论 URL 被重置成官方地址还是腾讯镜像，都能本地命中、永不联网。
# 用法：powershell -ExecutionPolicy Bypass -File prime-gradle-cache.ps1

$ErrorActionPreference = "Stop"
$dists = Join-Path $env:USERPROFILE ".gradle\wrapper\dists\gradle-8.14.3-bin"
$mirror = Join-Path $dists "40dfek2kz346l18gf9ltjsnyd"   # 腾讯云镜像 URL 的哈希目录（已完整）
$official = Join-Path $dists "cv11ve7ro1n3o1j4so8xd9n66" # 官方地址 URL 的哈希目录（目前只有残片）

if (-not (Test-Path (Join-Path $mirror "gradle-8.14.3\bin\gradle.bat"))) {
    Write-Error "未找到完整缓存目录：$mirror。请先让 wrapper 用腾讯云镜像 URL 成功跑一次，或手动下载 gradle-8.14.3-bin.zip 放入该目录。"
    exit 1
}

New-Item -ItemType Directory -Force -Path $official | Out-Null
# 清掉下载残片（.part/.lck）
Get-ChildItem $official -Filter "*.part" | Remove-Item -Force
Get-ChildItem $official -Filter "*.lck" | Remove-Item -Force

# 复制 zip + 解压目录 + ok 标记
Copy-Item (Join-Path $mirror "gradle-8.14.3-bin.zip") (Join-Path $official "gradle-8.14.3-bin.zip") -Force
Copy-Item (Join-Path $mirror "gradle-8.14.3") (Join-Path $official "gradle-8.14.3") -Recurse -Force
Copy-Item (Join-Path $mirror "gradle-8.14.3-bin.zip.ok") (Join-Path $official "gradle-8.14.3-bin.zip.ok") -Force

Write-Host "OK: 官方地址缓存目录已补齐。现在无论 wrapper 指向哪个 URL 都不会再联网下载。"
