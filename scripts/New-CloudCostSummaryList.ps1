<#
.SYNOPSIS
    Creates the CloudCostSummary SharePoint list on the InfrastructureV2 site.

.DESCRIPTION
    Provisions a list to store aggregated FOCUS cost data (monthly KPIs) consumed by the
    CostManagementDashboard component in the Cloud Platform web part.

.EXAMPLE
    .\New-CloudCostSummaryList.ps1
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$SiteUrl = "https://lebara.sharepoint.com/sites/InfrastructureV2",

    [Parameter(Mandatory=$false)]
    [string]$ListName = "CloudCostSummary"
)

# Connect to SharePoint
Connect-PnPOnline -Url $SiteUrl -Interactive

# Check if the list already exists
$existingList = Get-PnPList -Identity $ListName -ErrorAction SilentlyContinue
if ($existingList) {
    Write-Host "List '$ListName' already exists on $SiteUrl. Skipping creation." -ForegroundColor Yellow
    return
}

Write-Host "Creating list '$ListName'..." -ForegroundColor Cyan

# Create the list (Generic List template)
$list = New-PnPList -Title $ListName -Template GenericList -Hidden

Write-Host "Adding columns..." -ForegroundColor Cyan

# DateTime
Add-PnPField -List $ListName -DisplayName "ReportMonth" -InternalName "ReportMonth" -Type DateTime -AddToDefaultView

# Number fields (2 decimal places)
$numberFields = @(
    "EffectiveCost",
    "BilledCost",
    "CommitmentSavings",
    "NegotiatedSavings",
    "TotalSavings",
    "EffectiveSavingsRate",
    "TopSubscriptionCost",
    "TopServiceCost",
    "PreviousMonthCost",
    "MoMChange"
)

foreach ($field in $numberFields) {
    Add-PnPField -List $ListName -DisplayName $field -InternalName $field -Type Number -AddToDefaultView
    # Set decimal places to 2
    $f = Get-PnPField -List $ListName -Identity $field
    $f.SchemaXml = $f.SchemaXml -replace 'Decimals="\d+"', 'Decimals="2"'
    if ($f.SchemaXml -notmatch 'Decimals=') {
        $f.SchemaXml = $f.SchemaXml -replace '/>', ' Decimals="2" />'
    }
    $f.Update()
    $f.Context.ExecuteQuery()
}

# Single line of text fields
Add-PnPField -List $ListName -DisplayName "TopSubscription" -InternalName "TopSubscription" -Type Text -AddToDefaultView
Add-PnPField -List $ListName -DisplayName "TopService" -InternalName "TopService" -Type Text -AddToDefaultView

# Multi-line text fields (plain text for JSON storage)
Add-PnPField -List $ListName -DisplayName "SubscriptionBreakdown" -InternalName "SubscriptionBreakdown" -Type Note
Add-PnPField -List $ListName -DisplayName "ServiceBreakdown" -InternalName "ServiceBreakdown" -Type Note

# Hyperlink field
Add-PnPField -List $ListName -DisplayName "ReportUrl" -InternalName "ReportUrl" -Type URL -AddToDefaultView

# Hide from site navigation
$list = Get-PnPList -Identity $ListName
$list.Hidden = $true
$list.Update()
Invoke-PnPQuery

Write-Host "List '$ListName' created successfully with all columns." -ForegroundColor Green
Write-Host "Access via REST: $SiteUrl/_api/web/lists/getbytitle('$ListName')/items" -ForegroundColor Gray
