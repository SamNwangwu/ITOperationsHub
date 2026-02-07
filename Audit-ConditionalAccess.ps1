<#
.SYNOPSIS
    Finds Conditional Access policies that block Azure PowerShell / Graph PowerShell.
    Uses Azure CLI for authentication.
#>

# Known App IDs
$AzPowerShellAppId = "1950a258-227b-4e31-a9cf-717495945fc2"
$GraphPowerShellAppId = "14d82eec-204b-4c2f-b7e8-296a70dab67e"
$AzCliAppId = "04b07795-a710-4e7b-b9cd-2c1b9a5025a0"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Conditional Access Policy Audit" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Get token for Graph API via Azure CLI
$tokenJson = az account get-access-token --resource "https://graph.microsoft.com" 2>$null
if (-not $tokenJson) {
    Write-Host "[ERROR] Failed to get Graph token. Run 'az login' first." -ForegroundColor Red
    exit 1
}
$token = ($tokenJson | ConvertFrom-Json).accessToken
$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }

# Fetch all CA policies
Write-Host "[INFO] Fetching Conditional Access policies..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" -Headers $headers -Method Get
    $policies = $response.value
} catch {
    Write-Host "[ERROR] Failed to fetch CA policies: $_" -ForegroundColor Red
    Write-Host "[INFO] You may need the 'Policy.Read.All' permission." -ForegroundColor Yellow
    Write-Host "[INFO] Try: az login --scope https://graph.microsoft.com/Policy.Read.All" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Found $($policies.Count) Conditional Access policies" -ForegroundColor Green
Write-Host ""

# Analyse each policy
$relevantPolicies = @()

foreach ($policy in $policies) {
    $isRelevant = $false
    $reasons = @()

    $state = $policy.state
    $conditions = $policy.conditions
    $grant = $policy.grantControls

    # Skip disabled policies
    if ($state -eq 'disabled') { continue }

    # Check if policy targets "All cloud apps"
    $includeApps = $conditions.applications.includeApplications
    $excludeApps = $conditions.applications.excludeApplications

    $targetsAllApps = $includeApps -contains "All"
    $targetsAzPs = $includeApps -contains $AzPowerShellAppId
    $targetsGraphPs = $includeApps -contains $GraphPowerShellAppId
    $excludesAzPs = $excludeApps -contains $AzPowerShellAppId
    $excludesGraphPs = $excludeApps -contains $GraphPowerShellAppId
    $excludesAzCli = $excludeApps -contains $AzCliAppId

    # Policy affects Az PowerShell if it targets All apps (and doesn't exclude it) or targets it specifically
    if (($targetsAllApps -and -not $excludesAzPs) -or $targetsAzPs) {
        $isRelevant = $true
        $reasons += "Targets Azure PowerShell ($AzPowerShellAppId)"
    }
    if (($targetsAllApps -and -not $excludesGraphPs) -or $targetsGraphPs) {
        $isRelevant = $true
        $reasons += "Targets Graph PowerShell ($GraphPowerShellAppId)"
    }

    # Check what the grant controls require
    $grantRequirements = @()
    if ($grant) {
        if ($grant.builtInControls -contains 'compliantDevice') { $grantRequirements += "Compliant device" }
        if ($grant.builtInControls -contains 'domainJoinedDevice') { $grantRequirements += "Domain joined device" }
        if ($grant.builtInControls -contains 'mfa') { $grantRequirements += "MFA" }
        if ($grant.builtInControls -contains 'compliantApplication') { $grantRequirements += "Compliant application" }
        if ($grant.builtInControls -contains 'approvedApplication') { $grantRequirements += "Approved application" }
        if ($grant.builtInControls -contains 'block') { $grantRequirements += "BLOCK ACCESS" }
    }

    # Check device filter / platform conditions
    $deviceFilter = $conditions.devices
    $platforms = $conditions.platforms

    if ($isRelevant -and $grantRequirements.Count -gt 0) {
        $relevantPolicies += [PSCustomObject]@{
            Name              = $policy.displayName
            State             = $state
            Reasons           = ($reasons -join "; ")
            Requirements      = ($grantRequirements -join ", ")
            ExcludesAzCLI     = $excludesAzCli
            ExcludesAzPS      = $excludesAzPs
            ExcludesGraphPS   = $excludesGraphPs
            TargetsAllApps    = $targetsAllApps
            PolicyId          = $policy.id
        }
    }
}

# Display results
if ($relevantPolicies.Count -eq 0) {
    Write-Host "[INFO] No enabled CA policies found that would block Azure PowerShell." -ForegroundColor Green
    Write-Host "[INFO] The device compliance prompt may be coming from a different source." -ForegroundColor Yellow
} else {
    Write-Host "============================================" -ForegroundColor Yellow
    Write-Host "  Policies Affecting Azure PowerShell" -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Yellow
    Write-Host ""

    foreach ($p in $relevantPolicies) {
        $stateColour = if ($p.State -eq 'enabled') { 'Red' } elseif ($p.State -eq 'enabledForReportingButNotEnforced') { 'Yellow' } else { 'Gray' }

        Write-Host "  Policy: " -NoNewline; Write-Host "$($p.Name)" -ForegroundColor White
        Write-Host "  State:  " -NoNewline; Write-Host "$($p.State)" -ForegroundColor $stateColour
        Write-Host "  Requires: " -NoNewline; Write-Host "$($p.Requirements)" -ForegroundColor Red
        Write-Host "  Why:    $($p.Reasons)"
        Write-Host "  Excludes Az CLI:        $($p.ExcludesAzCLI)"
        Write-Host "  Excludes Az PowerShell: $($p.ExcludesAzPS)"
        Write-Host "  Excludes Graph PS:      $($p.ExcludesGraphPS)"
        Write-Host "  Policy ID: $($p.PolicyId)"
        Write-Host ""
    }

    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Recommended Fix" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  To exclude Azure PowerShell and Graph PowerShell from the blocking policy:" -ForegroundColor White
    Write-Host ""
    Write-Host "  1. Entra ID > Protection > Conditional Access" -ForegroundColor White
    Write-Host "  2. Open the policy listed above" -ForegroundColor White
    Write-Host "  3. Target resources > Exclude > Select cloud apps" -ForegroundColor White
    Write-Host "  4. Add these two apps:" -ForegroundColor White
    Write-Host "     - Microsoft Azure PowerShell  ($AzPowerShellAppId)" -ForegroundColor Yellow
    Write-Host "     - Microsoft Graph PowerShell  ($GraphPowerShellAppId)" -ForegroundColor Yellow
    Write-Host "  5. Save" -ForegroundColor White
    Write-Host ""
    Write-Host "  Or via CLI (replace <POLICY_ID>):" -ForegroundColor White
    Write-Host ""

    foreach ($p in $relevantPolicies) {
        # Build the updated exclude list
        $currentExcludes = @()
        $matchedPolicy = $policies | Where-Object { $_.id -eq $p.PolicyId }
        if ($matchedPolicy.conditions.applications.excludeApplications) {
            $currentExcludes = @($matchedPolicy.conditions.applications.excludeApplications)
        }

        $newExcludes = @($currentExcludes)
        if ($AzPowerShellAppId -notin $newExcludes) { $newExcludes += $AzPowerShellAppId }
        if ($GraphPowerShellAppId -notin $newExcludes) { $newExcludes += $GraphPowerShellAppId }

        $excludeJson = ($newExcludes | ForEach-Object { "`"$_`"" }) -join ","

        Write-Host "  # Fix policy: $($p.Name)" -ForegroundColor Gray
        Write-Host "  az rest --method PATCH --uri `"https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/$($p.PolicyId)`" --body '{`"conditions`":{`"applications`":{`"excludeApplications`":[$excludeJson]}}}'" -ForegroundColor Cyan
        Write-Host ""
    }
}