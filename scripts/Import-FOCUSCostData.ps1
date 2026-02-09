<#
.SYNOPSIS
    Imports aggregated FOCUS cost data from a CSV/CSV.gzip export into the CloudCostSummary SharePoint list.

.DESCRIPTION
    Reads a FinOps FOCUS 1.0 format CSV (or gzipped CSV), aggregates KPIs (effective cost,
    billed cost, savings, ESR, top subscriptions/services), and upserts into the
    CloudCostSummary list on InfrastructureV2.

.EXAMPLE
    .\Import-FOCUSCostData.ps1 -CsvPath "C:\Exports\LebaraLtd_FOCUS_Jan26.csv.gzip"
    .\Import-FOCUSCostData.ps1 -CsvPath "C:\Exports\LebaraLtd_FOCUS_Jan26.csv" -ReportUrl "https://lebara.sharepoint.com/..."
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$CsvPath,

    [Parameter(Mandatory=$false)]
    [string]$SiteUrl = "https://lebara.sharepoint.com/sites/InfrastructureV2",

    [Parameter(Mandatory=$false)]
    [string]$ListName = "CloudCostSummary",

    [Parameter(Mandatory=$false)]
    [string]$ReportUrl = ""
)

# ── 1. Decompress gzip if needed ────────────────────────────────────────────
$csvFile = $CsvPath

if ($CsvPath -match '\.(gzip|gz)$') {
    Write-Host "Decompressing gzip file..." -ForegroundColor Cyan
    $tempCsv = [System.IO.Path]::GetTempFileName() + ".csv"

    $inputStream  = [System.IO.File]::OpenRead($CsvPath)
    $gzipStream   = New-Object System.IO.Compression.GZipStream($inputStream, [System.IO.Compression.CompressionMode]::Decompress)
    $outputStream = [System.IO.File]::Create($tempCsv)

    $gzipStream.CopyTo($outputStream)

    $outputStream.Close()
    $gzipStream.Close()
    $inputStream.Close()

    $csvFile = $tempCsv
    Write-Host "Decompressed to $tempCsv" -ForegroundColor Gray
}

# ── 2. Import CSV ───────────────────────────────────────────────────────────
Write-Host "Importing CSV data..." -ForegroundColor Cyan
$rows = Import-Csv -Path $csvFile

if ($rows.Count -eq 0) {
    Write-Error "CSV file is empty or could not be parsed."
    return
}

Write-Host "Loaded $($rows.Count) rows." -ForegroundColor Gray

# ── 3. Determine report month ──────────────────────────────────────────────
$firstBillingPeriod = $rows[0].BillingPeriodStart
$reportDate = [DateTime]::Parse($firstBillingPeriod)
$titleKey = $reportDate.ToString("yyyy-MM")
$reportMonth = Get-Date -Year $reportDate.Year -Month $reportDate.Month -Day 1

Write-Host "Report month: $titleKey" -ForegroundColor Cyan

# ── 4. Aggregate totals ────────────────────────────────────────────────────
Write-Host "Aggregating cost data..." -ForegroundColor Cyan

$effectiveCostTotal  = 0.0
$billedCostTotal     = 0.0
$listCostTotal       = 0.0
$contractedCostTotal = 0.0

foreach ($row in $rows) {
    $effectiveCostTotal  += [double]$row.EffectiveCost
    $billedCostTotal     += [double]$row.BilledCost
    $listCostTotal       += [double]$row.ListCost
    $contractedCostTotal += [double]$row.ContractedCost
}

$commitmentSavings    = [Math]::Round($contractedCostTotal - $effectiveCostTotal, 2)
$negotiatedSavings    = [Math]::Round($listCostTotal - $contractedCostTotal, 2)
$totalSavings         = [Math]::Round($listCostTotal - $effectiveCostTotal, 2)
$effectiveSavingsRate = if ($listCostTotal -gt 0) { [Math]::Round(($totalSavings / $listCostTotal) * 100, 2) } else { 0 }

$effectiveCostTotal  = [Math]::Round($effectiveCostTotal, 2)
$billedCostTotal     = [Math]::Round($billedCostTotal, 2)

Write-Host "  Effective Cost : GBP $effectiveCostTotal" -ForegroundColor White
Write-Host "  Billed Cost    : GBP $billedCostTotal" -ForegroundColor White
Write-Host "  Total Savings  : GBP $totalSavings" -ForegroundColor Green
Write-Host "  ESR            : $effectiveSavingsRate%" -ForegroundColor Green

# ── 5. Subscription breakdown (top 10) ─────────────────────────────────────
Write-Host "Building subscription breakdown..." -ForegroundColor Cyan

$subGroups = $rows | Group-Object -Property SubAccountName | ForEach-Object {
    $cost = 0.0
    foreach ($item in $_.Group) { $cost += [double]$item.EffectiveCost }
    [PSCustomObject]@{ name = $_.Name; cost = [Math]::Round($cost, 2) }
} | Sort-Object -Property cost -Descending | Select-Object -First 10

$subscriptionBreakdownJson = ($subGroups | ForEach-Object {
    '{"name":"' + ($_.name -replace '"', '\"') + '","cost":' + $_.cost + '}'
}) -join ','
$subscriptionBreakdownJson = "[$subscriptionBreakdownJson]"

$topSubscription     = $subGroups[0].name
$topSubscriptionCost = $subGroups[0].cost

# ── 6. Service breakdown (top 10) ──────────────────────────────────────────
Write-Host "Building service breakdown..." -ForegroundColor Cyan

$svcGroups = $rows | Group-Object -Property ServiceName | ForEach-Object {
    $cost = 0.0
    foreach ($item in $_.Group) { $cost += [double]$item.EffectiveCost }
    [PSCustomObject]@{ name = $_.Name; cost = [Math]::Round($cost, 2) }
} | Sort-Object -Property cost -Descending | Select-Object -First 10

$serviceBreakdownJson = ($svcGroups | ForEach-Object {
    '{"name":"' + ($_.name -replace '"', '\"') + '","cost":' + $_.cost + '}'
}) -join ','
$serviceBreakdownJson = "[$serviceBreakdownJson]"

$topService     = $svcGroups[0].name
$topServiceCost = $svcGroups[0].cost

# ── 7. Connect to SharePoint ───────────────────────────────────────────────
Write-Host "Connecting to SharePoint..." -ForegroundColor Cyan
Connect-PnPOnline -Url $SiteUrl -Interactive

# ── 8. Upsert list item ────────────────────────────────────────────────────
$existingItems = Get-PnPListItem -List $ListName -Query "<View><Query><Where><Eq><FieldRef Name='Title'/><Value Type='Text'>$titleKey</Value></Eq></Where></Query></View>"

$fieldValues = @{
    "Title"                  = $titleKey
    "ReportMonth"            = $reportMonth
    "EffectiveCost"          = $effectiveCostTotal
    "BilledCost"             = $billedCostTotal
    "CommitmentSavings"      = $commitmentSavings
    "NegotiatedSavings"      = $negotiatedSavings
    "TotalSavings"           = $totalSavings
    "EffectiveSavingsRate"   = $effectiveSavingsRate
    "TopSubscription"        = $topSubscription
    "TopSubscriptionCost"    = $topSubscriptionCost
    "TopService"             = $topService
    "TopServiceCost"         = $topServiceCost
    "SubscriptionBreakdown"  = $subscriptionBreakdownJson
    "ServiceBreakdown"       = $serviceBreakdownJson
}

if ($ReportUrl -ne "") {
    $fieldValues["ReportUrl"] = "$ReportUrl, FOCUS Report"
}

if ($existingItems -and $existingItems.Count -gt 0) {
    Write-Host "Updating existing row for $titleKey..." -ForegroundColor Yellow
    Set-PnPListItem -List $ListName -Identity $existingItems[0].Id -Values $fieldValues
} else {
    Write-Host "Creating new row for $titleKey..." -ForegroundColor Green
    Add-PnPListItem -List $ListName -Values $fieldValues
}

# ── 9. Calculate MoM change from previous month ────────────────────────────
$prevDate = $reportMonth.AddMonths(-1)
$prevKey  = $prevDate.ToString("yyyy-MM")

$prevItems = Get-PnPListItem -List $ListName -Query "<View><Query><Where><Eq><FieldRef Name='Title'/><Value Type='Text'>$prevKey</Value></Eq></Where></Query></View>"

if ($prevItems -and $prevItems.Count -gt 0) {
    $prevCost = [double]$prevItems[0].FieldValues["EffectiveCost"]
    if ($prevCost -gt 0) {
        $momChange = [Math]::Round((($effectiveCostTotal - $prevCost) / $prevCost) * 100, 2)

        # Update current month with MoM data
        $currentItems = Get-PnPListItem -List $ListName -Query "<View><Query><Where><Eq><FieldRef Name='Title'/><Value Type='Text'>$titleKey</Value></Eq></Where></Query></View>"
        if ($currentItems -and $currentItems.Count -gt 0) {
            Set-PnPListItem -List $ListName -Identity $currentItems[0].Id -Values @{
                "PreviousMonthCost" = $prevCost
                "MoMChange"         = $momChange
            }
            Write-Host "  MoM Change: $momChange% (previous: GBP $prevCost)" -ForegroundColor Cyan
        }
    }
} else {
    Write-Host "  No previous month data found ($prevKey). MoM not calculated." -ForegroundColor Gray
}

# ── Cleanup ─────────────────────────────────────────────────────────────────
if ($CsvPath -match '\.(gzip|gz)$' -and (Test-Path $tempCsv)) {
    Remove-Item $tempCsv -Force
    Write-Host "Cleaned up temp file." -ForegroundColor Gray
}

Write-Host "`nDone! Cost data for $titleKey imported to $ListName." -ForegroundColor Green
