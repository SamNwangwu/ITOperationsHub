# Create-FeedbackList.ps1
# Creates the ITOpsFeedback list and Feedback-Attachments folder on ITOpsHub
# Run with PnP PowerShell: .\Create-FeedbackList.ps1

$siteUrl = "https://lebaragroup.sharepoint.com/sites/ITOpsHub"
Connect-PnPOnline -Url $siteUrl -Interactive

# --- Create the list ---
Write-Host "Creating ITOpsFeedback list..." -ForegroundColor Cyan
New-PnPList -Title "ITOpsFeedback" -Template GenericList -Url "Lists/ITOpsFeedback"

# --- Add columns ---
Write-Host "Adding columns..." -ForegroundColor Cyan

Add-PnPField -List "ITOpsFeedback" -DisplayName "Page" -InternalName "Page" -Type Choice -AddToDefaultView -Choices "Hub","Infrastructure","IAM","Platform","ServiceMgmt","Azure","AWS"
Add-PnPField -List "ITOpsFeedback" -DisplayName "SubmittedBy" -InternalName "SubmittedBy" -Type Text -AddToDefaultView
Add-PnPField -List "ITOpsFeedback" -DisplayName "SubmittedByEmail" -InternalName "SubmittedByEmail" -Type Text -AddToDefaultView
Add-PnPField -List "ITOpsFeedback" -DisplayName "FeedbackType" -InternalName "FeedbackType" -Type Choice -AddToDefaultView -Choices "Bug/Issue","Feature Request","Content Update","General Feedback"
Add-PnPField -List "ITOpsFeedback" -DisplayName "Priority" -InternalName "Priority" -Type Choice -AddToDefaultView -Choices "Low","Medium","High"
Add-PnPField -List "ITOpsFeedback" -DisplayName "Description" -InternalName "FBDescription" -Type Note -AddToDefaultView
Add-PnPField -List "ITOpsFeedback" -DisplayName "AttachmentUrl" -InternalName "AttachmentUrl" -Type URL
Add-PnPField -List "ITOpsFeedback" -DisplayName "Status" -InternalName "FBStatus" -Type Choice -AddToDefaultView -Choices "New","In Progress","Done","Won't Fix"
Add-PnPField -List "ITOpsFeedback" -DisplayName "AdminNotes" -InternalName "AdminNotes" -Type Note
Add-PnPField -List "ITOpsFeedback" -DisplayName "SubmittedDate" -InternalName "SubmittedDate" -Type DateTime -AddToDefaultView

# --- Set default view sort (newest first) ---
Write-Host "Configuring default view..." -ForegroundColor Cyan
$view = Get-PnPView -List "ITOpsFeedback" -Identity "All Items"
Set-PnPView -List "ITOpsFeedback" -Identity $view.Id -Values @{ViewQuery = '<OrderBy><FieldRef Name="SubmittedDate" Ascending="FALSE" /></OrderBy>'}

# --- Create attachments folder in Shared Documents ---
Write-Host "Creating Feedback-Attachments folder..." -ForegroundColor Cyan
$docLib = Get-PnPList -Identity "Shared Documents"
if ($docLib) {
    try {
        Add-PnPFolder -Name "Feedback-Attachments" -Folder "Shared Documents"
        Write-Host "Feedback-Attachments folder created." -ForegroundColor Green
    } catch {
        Write-Host "Folder may already exist: $_" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "ITOpsFeedback list created successfully!" -ForegroundColor Green
Write-Host "List URL: $siteUrl/Lists/ITOpsFeedback" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Go to List Settings > Permissions and break inheritance" -ForegroundColor Yellow
Write-Host "2. Remove all groups except site owners" -ForegroundColor Yellow
Write-Host "3. Add 'Members' group with 'Add Items' permission only" -ForegroundColor Yellow
