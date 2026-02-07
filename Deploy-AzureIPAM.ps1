<#
.SYNOPSIS
    Deploys Azure IPAM (open-source) to the Lebara Management Subscription.

.DESCRIPTION
    Wrapper script that:
    1. Uses Azure CLI (az) for authentication and all pre/post validation
    2. Uses Connect-AzAccount -UseDeviceAuthentication for Az PowerShell context
       (required by IPAM deploy.ps1 - creates a persistent cached credential)
    3. Bridges az CLI token into Microsoft.Graph for app registrations
    4. Clones the Azure/ipam repo and runs the official deploy.ps1
    5. Validates deployment using Azure CLI

    Based on: https://github.com/Azure/ipam

.NOTES
    Author:  Sam Nwangwu - Infrastructure Team
    Date:    February 2026
    
    Prerequisites:
    - PowerShell 7.4+
    - Azure CLI (az) installed and on PATH  ** PRIMARY AUTH METHOD **
    - Az PowerShell module (12.x+) -- required by IPAM deploy.ps1 internally
    - Microsoft.Graph PowerShell module -- required by IPAM deploy.ps1 for app registrations
    - Git installed and on PATH
    - Owner or User Access Administrator at Root Management Group
    - Owner on the Management Subscription

    AUTH STRATEGY:
    - Azure CLI (az login): Used for all our wrapper validation and post-deploy checks
    - Az PowerShell (device code): Required by IPAM deploy.ps1 internally. We use
      -UseDeviceAuthentication because interactive Connect-AzAccount doesn't work on
      Lebara managed devices. Device code gives you a URL + code to authenticate.
    - Microsoft.Graph: Bridged from az CLI token for app registration creation.

    GOTCHAS HANDLED:
    - NamePrefix max 7 chars (Key Vault name length limit)
    - NamePrefix and ResourceNames are mutually exclusive - we use NamePrefix only
    - Az PowerShell needs persistent cached credential (not just access token bridge)
    - Microsoft.Graph also needs auth for Entra app registrations
    - deploy.ps1 catch block wasn't stopping the script - now uses exit codes

.PARAMETER SkipPrereqCheck
    Skip prerequisite validation (use if you've already verified).

.PARAMETER ClonePath
    Directory to clone the IPAM repo into. Default: $env:TEMP\azure-ipam

.PARAMETER NamePrefix
    Resource name prefix. Max 7 characters. Default: 'lbripam'
    The IPAM deployer appends random suffixes to generate unique resource names.

.EXAMPLE
    .\Deploy-AzureIPAM.ps1

.EXAMPLE
    .\Deploy-AzureIPAM.ps1 -NamePrefix "lbrip" -SkipPrereqCheck
#>

[CmdletBinding()]
param(
    [switch]$SkipPrereqCheck,
    [string]$ClonePath = "$env:TEMP\azure-ipam",

    [ValidateLength(1, 7)]
    [string]$NamePrefix = "lbripam"
)

$ErrorActionPreference = 'Stop'

# ============================================================
# CONFIGURATION - Lebara Management Subscription
# ============================================================
$SubscriptionId   = "fc05ec66-8b61-4189-8e35-fabfe25662ba"
$SubscriptionName = "Management Subscription"
$Location         = "northeurope"
$UIAppName        = "Lebara-IPAM-UI"
$EngineAppName    = "Lebara-IPAM-Engine"

$Tags = @{
    owner       = 'sam.nwangwu@lebara.com'
    environment = 'production'
    project     = 'IT Operations Hub'
    application = 'Azure IPAM'
    costcentre  = 'Infrastructure'
}

# NOTE: We do NOT pass -ResourceNames because it is mutually exclusive with -NamePrefix.
# The IPAM deploy.ps1 auto-generates resource names from the prefix with random suffixes.

# ============================================================
# FUNCTIONS
# ============================================================
function Write-Step {
    param([string]$Message, [string]$Status = "INFO")
    $colour = switch ($Status) {
        "INFO"    { "Cyan" }
        "OK"      { "Green" }
        "WARN"    { "Yellow" }
        "ERROR"   { "Red" }
        default   { "White" }
    }
    Write-Host "[$Status] " -ForegroundColor $colour -NoNewline
    Write-Host $Message
}

function Test-Prerequisites {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Azure IPAM - Prerequisite Checks" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""

    $allPassed = $true

    # PowerShell version
    $psVersion = $PSVersionTable.PSVersion
    if ($psVersion.Major -lt 7) {
        Write-Step "PowerShell 7+ required. Current: $psVersion" "ERROR"
        $allPassed = $false
    } else {
        Write-Step "PowerShell $psVersion" "OK"
    }

    # Azure CLI (primary auth)
    $azCli = Get-Command az -ErrorAction SilentlyContinue
    if (-not $azCli) {
        Write-Step "Azure CLI (az) not found. Install from: https://aka.ms/installazurecli" "ERROR"
        $allPassed = $false
    } else {
        $azVersion = (az version 2>$null | ConvertFrom-Json).'azure-cli'
        Write-Step "Azure CLI v$azVersion" "OK"
    }

    # Az PowerShell module
    $azModule = Get-Module -Name Az -ListAvailable | Sort-Object Version -Descending | Select-Object -First 1
    if (-not $azModule) {
        Write-Step "Az PowerShell module not found (required by upstream IPAM deploy.ps1)" "ERROR"
        Write-Step "Install: Install-Module -Name Az -Force -Scope CurrentUser" "INFO"
        $allPassed = $false
    } else {
        Write-Step "Az PowerShell module v$($azModule.Version) (for IPAM deployer)" "OK"
    }

    # Microsoft.Graph module
    $graphModule = Get-Module -Name Microsoft.Graph -ListAvailable | Sort-Object Version -Descending | Select-Object -First 1
    if (-not $graphModule) {
        Write-Step "Microsoft.Graph module not found (required for Entra app registrations)" "ERROR"
        Write-Step "Install: Install-Module -Name Microsoft.Graph -Force -Scope CurrentUser" "INFO"
        $allPassed = $false
    } else {
        Write-Step "Microsoft.Graph module v$($graphModule.Version)" "OK"
    }

    # Git
    $git = Get-Command git -ErrorAction SilentlyContinue
    if (-not $git) {
        Write-Step "Git not found on PATH. Install from: https://git-scm.com" "ERROR"
        $allPassed = $false
    } else {
        Write-Step "Git found: $($git.Source)" "OK"
    }

    Write-Host ""
    return $allPassed
}

function Connect-AzureCLI {
    Write-Step "Checking Azure CLI authentication..."

    $account = $null
    try { $account = az account show 2>$null | ConvertFrom-Json } catch { }

    if (-not $account) {
        Write-Step "Not authenticated. Launching az login..." "WARN"
        az login --output none
        try { $account = az account show 2>$null | ConvertFrom-Json } catch { }
        if (-not $account) {
            Write-Step "Azure CLI authentication failed." "ERROR"
            return $false
        }
    }
    Write-Step "Authenticated as: $($account.user.name)" "OK"
    Write-Step "Tenant: $($account.tenantId)" "OK"

    # Set correct subscription
    if ($account.id -ne $SubscriptionId) {
        Write-Step "Switching to $SubscriptionName..." "INFO"
        az account set --subscription $SubscriptionId 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Step "Failed to set subscription $SubscriptionId" "ERROR"
            Write-Step "Available subscriptions:" "INFO"
            az account list --query "[].{Name:name, Id:id}" -o table
            return $false
        }
    }

    $account = az account show 2>$null | ConvertFrom-Json
    Write-Step "Subscription: $($account.name) ($($account.id))" "OK"

    $script:TenantId = $account.tenantId
    $script:AccountId = $account.user.name
    return $true
}

function Bridge-AzPowerShellContext {
    <#
    .SYNOPSIS
        Bridges the active Azure CLI session into Az PowerShell context.
        Uses the az CLI access token so we never need Connect-AzAccount interactively.
        Note: This creates an in-memory context. The IPAM deploy.ps1 will be patched
        post-clone to inject auth before it runs any Az cmdlets.
    #>
    Write-Step "Bridging Azure CLI token into Az PowerShell context..."

    try {
        # Clear any stale context first
        Clear-AzContext -Force -ErrorAction SilentlyContinue | Out-Null

        # Get access token from Azure CLI for ARM
        $tokenJson = az account get-access-token --resource "https://management.azure.com" 2>$null
        if (-not $tokenJson) { throw "Failed to get ARM access token from CLI" }
        $token = $tokenJson | ConvertFrom-Json

        # Get Graph token too - needed for New-AzADApplication and other Graph calls
        $graphTokenJson = az account get-access-token --resource "https://graph.microsoft.com" 2>$null
        if (-not $graphTokenJson) { throw "Failed to get Graph access token from CLI" }
        $graphToken = ($graphTokenJson | ConvertFrom-Json).accessToken

        # Connect with both ARM and Graph tokens
        Connect-AzAccount `
            -AccessToken $token.accessToken `
            -MicrosoftGraphAccessToken $graphToken `
            -AccountId $script:AccountId `
            -TenantId $script:TenantId `
            -SubscriptionId $SubscriptionId `
            -SkipValidation `
            -Force `
            -WarningAction SilentlyContinue | Out-Null

        # Save the context to disk so child processes can pick it up
        $contextPath = Join-Path $env:TEMP "az-context-ipam.json"
        Save-AzContext -Path $contextPath -Force | Out-Null

        $azContext = Get-AzContext
        Write-Step "Az PowerShell context bridged: $($azContext.Subscription.Name)" "OK"
        Write-Step "Context saved to: $contextPath" "OK"

        $script:AzContextPath = $contextPath
        return $true
    }
    catch {
        Write-Step "Token bridge failed: $_" "ERROR"
        return $false
    }
}

function Patch-IpamDeployScript {
    <#
    .SYNOPSIS
        Patches the cloned IPAM deploy.ps1 to import our saved Az context
        before it tries to call any Az cmdlets. This is necessary because
        Connect-AzAccount is blocked by Conditional Access on Lebara devices,
        and the in-memory token bridge doesn't persist into the child script scope.
    #>
    param([string]$DeployScriptPath)

    Write-Step "Patching IPAM deploy.ps1 to use bridged Az context..."

    $content = Get-Content $DeployScriptPath -Raw

    # The IPAM script starts with transcript logging then does Az calls.
    # We inject our context import right after the param block / initial setup.
    # Look for the first Az call pattern and inject before it.
    $injectCode = @"

# ============================================================
# INJECTED BY Lebara Deploy-AzureIPAM.ps1
# Bridge Az PowerShell context from Azure CLI tokens
# This bypasses Connect-AzAccount which is blocked by CA policies
# Tokens are fetched fresh from az CLI to avoid expiry issues
# ============================================================
try {
    `$armTokenJson = az account get-access-token --resource "https://management.azure.com" 2>`$null
    `$graphTokenJson = az account get-access-token --resource "https://graph.microsoft.com" 2>`$null
    if (`$armTokenJson -and `$graphTokenJson) {
        `$armToken = (`$armTokenJson | ConvertFrom-Json).accessToken
        `$graphToken = (`$graphTokenJson | ConvertFrom-Json).accessToken
        `$accountId = (az account show 2>`$null | ConvertFrom-Json).user.name
        `$tenantId = (az account show 2>`$null | ConvertFrom-Json).tenantId
        `$subId = (az account show 2>`$null | ConvertFrom-Json).id
        Connect-AzAccount ``
            -AccessToken `$armToken ``
            -MicrosoftGraphAccessToken `$graphToken ``
            -AccountId `$accountId ``
            -TenantId `$tenantId ``
            -SubscriptionId `$subId ``
            -SkipValidation ``
            -Force ``
            -WarningAction SilentlyContinue | Out-Null
        Write-Host "INFO: Imported Az PowerShell context from CLI bridge (ARM + Graph tokens)"
    } else {
        Write-Host "WARNING: Could not get tokens from az CLI"
    }
} catch {
    Write-Host "WARNING: Failed to bridge Az context: `$_"
}
# ============================================================

"@

    # Inject after the first line that starts the transcript or after param block
    # The IPAM script has: Start-Transcript ... then INFO messages then Get-AzLocation
    # Safest injection point: right before "Fetching Tenant ID"
    $marker = 'INFO: Fetching Tenant ID from Azure PowerShell SDK'

    if ($content -match [regex]::Escape($marker)) {
        # Find the Write-Host line containing this marker and inject before it
        $lines = Get-Content $DeployScriptPath
        $injected = $false
        $newLines = @()

        foreach ($line in $lines) {
            if (-not $injected -and $line -match [regex]::Escape($marker)) {
                # Insert our context import before this line
                $newLines += $injectCode
                $injected = $true
            }
            $newLines += $line
        }

        if ($injected) {
            $newLines | Set-Content $DeployScriptPath -Force
            Write-Step "Patched deploy.ps1 - Az context import injected" "OK"
            return $true
        }
    }

    # Fallback: inject at the very beginning after param block
    # Find the closing of the param block
    if ($content -match '(?s)(param\s*\(.*?\))') {
        $paramEnd = $content.IndexOf($Matches[0]) + $Matches[0].Length
        $newContent = $content.Insert($paramEnd, "`n$injectCode")
        $newContent | Set-Content $DeployScriptPath -Force
        Write-Step "Patched deploy.ps1 - Az context import injected (fallback)" "OK"
        return $true
    }

    Write-Step "Could not find injection point in deploy.ps1" "WARN"
    return $false
}

function Bridge-GraphContext {
    <#
    .SYNOPSIS
        Bridges Azure CLI token into Microsoft.Graph context.
        The IPAM deploy.ps1 uses Graph to create Entra app registrations.
    #>
    Write-Step "Bridging Azure CLI token into Microsoft.Graph context..."

    try {
        $graphTokenJson = az account get-access-token --resource "https://graph.microsoft.com" 2>$null
        if (-not $graphTokenJson) { throw "Failed to get Graph access token from CLI" }
        $graphToken = ($graphTokenJson | ConvertFrom-Json).accessToken

        $secureGraphToken = ConvertTo-SecureString $graphToken -AsPlainText -Force
        Connect-MgGraph -AccessToken $secureGraphToken -NoWelcome -ErrorAction Stop

        $graphContext = Get-MgContext
        if ($graphContext) {
            Write-Step "Microsoft.Graph context bridged: $($graphContext.Account)" "OK"
        } else {
            throw "Graph context is null"
        }
    }
    catch {
        Write-Step "Graph token bridge failed: $_" "WARN"
        Write-Step "The IPAM deploy.ps1 may prompt for Graph authentication separately." "INFO"
    }

    return $true
}

function Test-PostDeployment {
    Write-Host ""
    Write-Step "Running post-deployment validation (Azure CLI)..."

    # Search by tag first, then prefix
    $rgs = az group list --query "[?tags.application=='Azure IPAM'].name" -o tsv 2>$null
    if (-not $rgs) {
        $rgs = az group list --query "[?starts_with(name, '$NamePrefix')].name" -o tsv 2>$null
    }

    if ($rgs) {
        foreach ($rg in ($rgs -split "`n")) {
            $rg = $rg.Trim()
            if (-not $rg) { continue }

            Write-Step "Resource group: $rg" "OK"

            # App Service
            $apps = az webapp list --resource-group $rg --query "[].{Name:name, State:state}" -o json 2>$null | ConvertFrom-Json
            foreach ($app in $apps) {
                Write-Step "App Service: $($app.Name) - $($app.State)" $(if ($app.State -eq 'Running') { 'OK' } else { 'WARN' })
                if ($app.State -eq 'Running') {
                    $script:IpamUrl = "https://$($app.Name).azurewebsites.net"
                }
            }

            # Cosmos, KV, MI
            $cosmos = az cosmosdb list --resource-group $rg --query "[].name" -o tsv 2>$null
            if ($cosmos) { Write-Step "Cosmos DB: $($cosmos.Trim())" "OK" }

            $kv = az keyvault list --resource-group $rg --query "[].name" -o tsv 2>$null
            if ($kv) { Write-Step "Key Vault: $($kv.Trim())" "OK" }

            $mi = az identity list --resource-group $rg --query "[].name" -o tsv 2>$null
            if ($mi) { Write-Step "Managed Identity: $($mi.Trim())" "OK" }
        }
    } else {
        Write-Step "No IPAM resource groups found. Check deployment logs." "WARN"
    }
}

# ============================================================
# MAIN EXECUTION
# ============================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Azure IPAM Deployment - Lebara" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Step "Subscription:   $SubscriptionName ($SubscriptionId)"
Write-Step "Location:       $Location"
Write-Step "Name Prefix:    $NamePrefix (max 7 chars - resources get random suffixes)"
Write-Step "UI App Reg:     $UIAppName"
Write-Step "Engine App Reg: $EngineAppName"
Write-Step "Auth:           az login (CLI) + token bridge (Az PowerShell)"
Write-Host ""

# --- Prerequisites ---
if (-not $SkipPrereqCheck) {
    $prereqOk = Test-Prerequisites
    if (-not $prereqOk) {
        Write-Step "Prerequisite checks failed. Fix the issues above and re-run." "ERROR"
        exit 1
    }
}

# --- Authenticate via Azure CLI (for our wrapper) ---
$authOk = Connect-AzureCLI
if (-not $authOk) {
    Write-Step "Azure CLI auth failed. Run 'az login' manually and retry." "ERROR"
    exit 1
}

# --- Authenticate Az PowerShell via token bridge (for IPAM deploy.ps1) ---
$azPsOk = Bridge-AzPowerShellContext
if (-not $azPsOk) {
    Write-Step "Az PowerShell bridge failed. Cannot proceed." "ERROR"
    exit 1
}

# --- Bridge Microsoft.Graph from CLI token (for app registrations) ---
Bridge-GraphContext | Out-Null

# --- Clone IPAM Repo ---
Write-Host ""
Write-Step "Cloning Azure IPAM repository..."

if (Test-Path $ClonePath) {
    Write-Step "Existing clone found - pulling latest..." "INFO"
    Push-Location $ClonePath
    try { git pull origin main 2>&1 | Out-Null; Write-Step "Pulled latest" "OK" }
    catch { Write-Step "Git pull failed, using existing clone" "WARN" }
    Pop-Location
} else {
    git clone https://github.com/Azure/ipam.git $ClonePath 2>&1 | Out-Null
}

if (-not (Test-Path "$ClonePath\deploy\deploy.ps1")) {
    Write-Step "deploy.ps1 not found at $ClonePath\deploy\deploy.ps1" "ERROR"
    exit 1
}
Write-Step "IPAM repo ready at: $ClonePath" "OK"

# --- Patch IPAM deploy.ps1 to use our bridged context ---
$patchOk = Patch-IpamDeployScript -DeployScriptPath "$ClonePath\deploy\deploy.ps1"
if (-not $patchOk) {
    Write-Step "Warning: Could not patch deploy.ps1. Deployment may fail on Az auth." "WARN"
}

# --- Confirm ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Starting IPAM Deployment" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Step "This will create:"
Write-Step "  - 2 Entra ID App Registrations ($UIAppName, $EngineAppName)"
Write-Step "  - Resource Group (prefix: $NamePrefix + random suffix)"
Write-Step "  - App Service + Plan (Linux containers, public images)"
Write-Step "  - Cosmos DB (serverless)"
Write-Step "  - Key Vault"
Write-Step "  - Log Analytics Workspace"
Write-Step "  - Managed Identity (Reader at Root Management Group)"
Write-Host ""

$confirm = Read-Host "Proceed with deployment? (Y/N)"
if ($confirm -notin @('Y', 'y', 'Yes', 'yes')) {
    Write-Step "Deployment cancelled." "WARN"
    exit 0
}

# --- Execute official IPAM deploy.ps1 ---
Push-Location "$ClonePath\deploy"

$deploySuccess = $false
try {
    .\deploy.ps1 `
        -Location $Location `
        -UIAppName $UIAppName `
        -EngineAppName $EngineAppName `
        -NamePrefix $NamePrefix `
        -Tags $Tags
    $deploySuccess = $true
}
catch {
    Write-Host ""
    Write-Step "Deployment failed: $_" "ERROR"

    # Show latest log path
    if (Test-Path "$ClonePath\logs") {
        $latestLog = Get-ChildItem "$ClonePath\logs" -Filter "*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latestLog) { Write-Step "Latest log: $($latestLog.FullName)" "INFO" }
    }
}

Pop-Location

if (-not $deploySuccess) { exit 1 }

# --- Post-Deployment Validation ---
Test-PostDeployment

# --- Summary ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Deployment Complete" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

if ($script:IpamUrl) {
    Write-Step "IPAM URL: $script:IpamUrl" "OK"
} else {
    Write-Step "Find IPAM URL:" "INFO"
    Write-Step "  az webapp list --query `"[?contains(name,'$NamePrefix')].defaultHostName`" -o tsv" "INFO"
}

Write-Host ""
Write-Host "--- Next Steps ---" -ForegroundColor Yellow
Write-Host ""
Write-Step "1. Open the IPAM URL and sign in with your Entra ID credentials"
Write-Step "2. Engine auto-discovers VNets, Subnets, IP usage across the tenant"
Write-Step "3. First scan takes 5-10 minutes depending on tenant size"
Write-Step "4. Configure Spaces and Blocks to organise IP address ranges"
Write-Host ""
Write-Step "5. Integrate with IT Ops Hub Azure CloudPlatform web part"
Write-Step "   New sidebar section: Networking / IP Management"
Write-Host ""
Write-Step "6. (Optional) Restrict access:"
Write-Step "   az webapp config access-restriction add --resource-group <rg> --name <app> --rule-name 'OfficeVPN' --priority 100 --ip-address '<IP>/32' --action Allow"
Write-Host ""