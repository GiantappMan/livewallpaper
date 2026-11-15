# 发布后刷新国内 EdgeOne CDN 的清单 JSON 缓存（.release.json postRelease 调用）。
# releases.giantapp.cn 是 releases.giantapp.cc（R2 直连）的国内加速入口，
# EdgeOne 边缘会把旧清单缓存数小时且缓存 key 忽略查询参数，发版后需主动刷新。
# 凭据由 tccli 本地配置（~/.tccli）提供，本脚本不接触密钥；未配置或调用失败非零退出。
# 发布流程注入的上下文: RELEASE_CHANNEL=stable|preview（缺省刷双通道清单）
#
# 用法: powershell -File purge-cdn.ps1                        # 按 RELEASE_CHANNEL 决定刷哪个清单
#       powershell -File purge-cdn.ps1 -Paths "wallpaper3/stable.json"   # 手动指定
param(
    [string[]]$Paths = @(),
    [string]$Domain = "releases.giantapp.cn",
    [string]$ZoneName = "giantapp.cn",
    [string]$TccliPath = "",
    [int]$TimeoutSec = 120
)

$ErrorActionPreference = "Stop"

# 发布流程注入的通道上下文 -> 默认刷新目标
if (-not $Paths -or $Paths.Count -eq 0) {
    switch ($env:RELEASE_CHANNEL) {
        "stable"  { $Paths = @("wallpaper3/stable.json") }
        "preview" { $Paths = @("wallpaper3/preview.json") }
        default   { $Paths = @("wallpaper3/stable.json", "wallpaper3/preview.json") }
    }
}

# 定位 tccli：参数 > 环境变量 TEO_TCCLI_PATH > PATH > 商店版 Python 常见路径
if (-not $TccliPath -and $env:TEO_TCCLI_PATH) { $TccliPath = $env:TEO_TCCLI_PATH }
if (-not $TccliPath) {
    $cmd = Get-Command tccli -ErrorAction SilentlyContinue
    if ($cmd) { $TccliPath = $cmd.Source }
}
if (-not $TccliPath) {
    $hit = Get-ChildItem "$env:LOCALAPPDATA\Packages\PythonSoftwareFoundation.Python.*\LocalCache\local-packages\Python3*\Scripts\tccli.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($hit) { $TccliPath = $hit.FullName }
}
if (-not $TccliPath -or -not (Test-Path $TccliPath)) { Write-Host "未找到 tccli，请先 pip install tccli 或用 -TccliPath 指定。"; exit 1 }

# teo 是无地域服务，不传 region；EAP 临时放宽，让 stderr 进结果而不是抛异常
function Invoke-TeoJson([string[]]$TcArgs) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $out = & $TccliPath teo @TcArgs 2>&1
    } finally {
        $ErrorActionPreference = $prev
    }
    $text = ($out | ForEach-Object { $_.ToString() }) -join "`n"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "tccli 调用失败: $text"
        if ($text -match "secretId") { Write-Host "请在终端重新运行 tccli configure 配置有效密钥（凭据只存本机 ~/.tccli，不入仓库）。" }
        exit 1
    }
    return ($text | ConvertFrom-Json)
}

# 手工拼 JSON 数组。PS5.1 给子进程传参会吃掉内嵌双引号，须预转义成 \" 才能原样到达 tccli
function To-JsonArray([string[]]$Items) {
    $quoted = ($Items | ForEach-Object { '\"' + $_ + '\"' }) -join ','
    return ('[' + $quoted + ']')
}

# 1. 查站点 ZoneId
$zones = Invoke-TeoJson @("DescribeZones")
$zone = $zones.Zones | Where-Object { $_.ZoneName -eq $ZoneName } | Select-Object -First 1
if (-not $zone) { Write-Host "EdgeOne 账号下未找到站点 $ZoneName，现有: $(($zones.Zones | ForEach-Object { $_.ZoneName }) -join ', ')"; exit 1 }
Write-Host "站点: $ZoneName -> $($zone.ZoneId)"

# 2. 提交 URL 刷新（invalidate=标记过期回源校验，不删缓存）
$targets = $Paths | ForEach-Object { "https://$Domain/$_" }
$resp = Invoke-TeoJson @("CreatePurgeTask", "--ZoneId", $zone.ZoneId, "--Type", "purge_url", "--Method", "invalidate", "--Targets", (To-JsonArray $targets))
if ($resp.FailedList -and $resp.FailedList.Count -gt 0) { Write-Host "部分 URL 提交失败: $($resp.FailedList | ConvertTo-Json -Compress)"; exit 1 }
Write-Host "刷新任务已提交: $($resp.JobId) -> $($targets -join ', ')"

# 3. 轮询任务状态到完成（DescribePurgeTasks 不收 JobId，按时间窗拉取后本地匹配）
$startIso = (Get-Date).ToUniversalTime().AddMinutes(-5).ToString("yyyy-MM-ddTHH:mm:ssZ")
$endIso = (Get-Date).ToUniversalTime().AddMinutes(5).ToString("yyyy-MM-ddTHH:mm:ssZ")
$deadline = (Get-Date).AddSeconds($TimeoutSec)
do {
    Start-Sleep -Seconds 5
    $detail = Invoke-TeoJson @("DescribePurgeTasks", "--ZoneId", $zone.ZoneId, "--StartTime", $startIso, "--EndTime", $endIso)
    $statuses = @($detail.Tasks | Where-Object { $_.JobId -eq $resp.JobId } | ForEach-Object { $_.Status })
    Write-Host "任务状态: $($statuses -join ', ')"
    if ($statuses.Count -gt 0 -and ($statuses | Where-Object { $_ -notin @("done", "finished", "success") }).Count -eq 0) {
        Write-Host "刷新完成。"
        exit 0
    }
} while ((Get-Date) -lt $deadline)
Write-Host "等待超时（任务仍在处理，可稍后自行验证或重跑）。"
exit 1
