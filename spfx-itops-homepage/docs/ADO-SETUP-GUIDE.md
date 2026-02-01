# Azure DevOps Setup Guide - SPFx CI/CD

Complete setup guide for SPFx build and deploy pipeline in Azure DevOps.

---

## Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Developer     │────▶│   Azure DevOps  │────▶│   SharePoint    │
│   Push Code     │     │   Pipeline      │     │   App Catalog   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │   Entra ID      │
                        │   App (Auth)    │
                        └─────────────────┘
```

---

## Step 1: Create Entra ID App for Deployment

This app allows the pipeline to deploy to SharePoint without user interaction.

### 1.1 Register the App

1. Go to **Azure Portal** > **Entra ID** > **App registrations**
2. Click **New registration**
3. Configure:
   - **Name:** `SPFx-Pipeline-Deployment`
   - **Supported account types:** Single tenant
   - **Redirect URI:** Leave blank
4. Click **Register**

### 1.2 Note the IDs

After creation, note these values:
- **Application (client) ID:** `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Directory (tenant) ID:** `d7093539-83cd-4991-b1b3-aacef74cf097` (your Lebara tenant)

### 1.3 Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Set expiry (recommend 24 months)
4. **Copy the secret value immediately** - you won't see it again

### 1.4 Add API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **SharePoint** > **Application permissions**
4. Add: `Sites.FullControl.All`
5. Click **Grant admin consent for Lebara Ltd**

### 1.5 (Optional) Use Certificate Instead of Secret

For production, certificate auth is more secure:

```powershell
# Generate self-signed cert
$cert = New-SelfSignedCertificate -Subject "CN=SPFx-Pipeline" -CertStoreLocation "Cert:\CurrentUser\My" -KeyExportPolicy Exportable -KeySpec Signature -KeyLength 2048 -NotAfter (Get-Date).AddYears(2)

# Export public key (.cer) for Azure
Export-Certificate -Cert $cert -FilePath "SPFx-Pipeline.cer"

# Export private key (.pfx) for pipeline
$password = ConvertTo-SecureString -String "YourPassword" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "SPFx-Pipeline.pfx" -Password $password
```

Upload the `.cer` to the App Registration under **Certificates & secrets** > **Certificates**.

---

## Step 2: Create Azure DevOps Project

### 2.1 Create Project

1. Go to **https://dev.azure.com/lebara** (or your org URL)
2. Click **New project**
3. Configure:
   - **Name:** `IT-Operations-Hub`
   - **Visibility:** Private
   - **Version control:** Git
   - **Work item process:** Agile (or your preference)
4. Click **Create**

### 2.2 Create Repository

1. In the project, go to **Repos** > **Files**
2. You'll see an empty repo - note the clone URL
3. Or create a new repo: **Repos** > **New repository**
   - **Name:** `spfx-itops-homepage`
   - **Add a README:** No (we have one)

---

## Step 3: Push SPFx Code to Repo

### 3.1 Clone and Push

```bash
# Clone the empty ADO repo
git clone https://dev.azure.com/lebara/IT-Operations-Hub/_git/spfx-itops-homepage
cd spfx-itops-homepage

# Copy your SPFx project files here
# (from the zip I provided)

# Add all files
git add .
git commit -m "Initial SPFx project setup"
git push origin main
```

### 3.2 Repository Structure

```
spfx-itops-homepage/
├── .gitignore
├── azure-pipelines.yml      ← Pipeline definition
├── README.md
├── package.json
├── tsconfig.json
├── gulpfile.js
├── config/
│   └── package-solution.json
└── src/
    └── webparts/
        └── itOpsHomepage/
            ├── ItOpsHomepageWebPart.ts
            ├── ItOpsHomepageWebPart.manifest.json
            └── components/
                ├── ItOpsHomepage.tsx
                ├── ItOpsHomepage.module.scss
                └── IItOpsHomepageProps.ts
```

---

## Step 4: Create Variable Group

Store sensitive values securely.

### 4.1 Create Variable Group

1. Go to **Pipelines** > **Library**
2. Click **+ Variable group**
3. Configure:
   - **Name:** `spfx-deployment`
   - **Description:** SPFx deployment credentials

### 4.2 Add Variables

| Variable Name | Value | Secret? |
|---------------|-------|---------|
| `TENANT_ID` | `d7093539-83cd-4991-b1b3-aacef74cf097` | No |
| `CLIENT_ID` | `<from Step 1.2>` | No |
| `CLIENT_SECRET` | `<from Step 1.3>` | **Yes** |
| `APP_CATALOG_URL` | `https://lebara.sharepoint.com/sites/appcatalog` | No |

4. Click the lock icon next to `CLIENT_SECRET` to mark as secret
5. Click **Save**

### 4.3 (If Using Certificate)

Instead of CLIENT_SECRET, you'll need to:
1. Upload the .pfx as a **Secure file** in Library
2. Modify the pipeline to use certificate auth

---

## Step 5: Create App Catalog (If Not Exists)

### 5.1 Check for Existing App Catalog

```powershell
Connect-PnPOnline -Url "https://lebara-admin.sharepoint.com" -Interactive
Get-PnPTenantAppCatalogUrl
```

### 5.2 Create App Catalog (If Needed)

In **SharePoint Admin Center**:
1. Go to **More features** > **Apps** > **Open**
2. Click **App Catalog**
3. If prompted, create new: `https://lebara.sharepoint.com/sites/appcatalog`

---

## Step 6: Create Pipeline

### 6.1 Create Pipeline from YAML

1. Go to **Pipelines** > **Pipelines**
2. Click **New pipeline**
3. Select **Azure Repos Git**
4. Select your repo: `spfx-itops-homepage`
5. Select **Existing Azure Pipelines YAML file**
6. Choose `/azure-pipelines.yml`
7. Click **Continue**
8. Review the YAML
9. Click **Run** (or Save first to review)

### 6.2 Approve Environments

On first run, you'll be prompted to approve:
- Variable group access
- Environment access

Click **Permit** for each.

### 6.3 Create Environments (Optional but Recommended)

1. Go to **Pipelines** > **Environments**
2. Create: `spfx-dev`
3. Create: `spfx-production`
4. For production, add **Approvals**:
   - Click on `spfx-production`
   - Click **...** > **Approvals and checks**
   - Add **Approvals** > Select approvers

---

## Step 7: Verify Deployment

### 7.1 Check Pipeline Run

1. Go to **Pipelines** > click on your pipeline
2. Watch the stages: Build → Deploy
3. Check logs for any errors

### 7.2 Check App Catalog

1. Go to `https://lebara.sharepoint.com/sites/appcatalog`
2. Click **Apps for SharePoint**
3. You should see `it-ops-homepage-client-side-solution`

### 7.3 Add to a Site

1. Go to any IT Ops Hub site
2. Edit a page
3. Add web part > Search "IT Operations Homepage"
4. Configure and publish

---

## Pipeline Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                           TRIGGER                                     │
│                    Push to main OR PR                                 │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         BUILD STAGE                                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │ Node.js │─▶│npm ci   │─▶│ gulp    │─▶│ gulp    │─▶│Publish  │   │
│  │ Setup   │  │         │  │ bundle  │  │ package │  │Artifact │   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼ (PR only)                     ▼ (main branch)
┌─────────────────────────┐     ┌─────────────────────────┐
│     DEPLOY DEV          │     │     DEPLOY PROD         │
│  ┌───────────────────┐  │     │  ┌───────────────────┐  │
│  │ Download artifact │  │     │  │ Download artifact │  │
│  │ Connect to SP     │  │     │  │ Approval gate     │  │
│  │ Add-PnPApp        │  │     │  │ Connect to SP     │  │
│  └───────────────────┘  │     │  │ Add-PnPApp        │  │
└─────────────────────────┘     │  └───────────────────┘  │
                                └─────────────────────────┘
```

---

## Maintenance

### Updating SPFx Version

1. Update `package.json` with new versions
2. Run `npm install` locally
3. Test with `gulp serve`
4. Commit and push
5. Pipeline auto-deploys

### Monitoring

- Check **Pipelines** > **Runs** for build status
- Enable email notifications for failed builds
- Set up Azure Monitor alerts (optional)

### Rollback

1. Go to **Pipelines** > **Runs**
2. Find last working build
3. Click **...** > **Rerun jobs**
4. Or manually download artifact and deploy via PnP PowerShell

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Access denied" on deployment | Check Entra app has Sites.FullControl.All + admin consent |
| "App catalog not found" | Verify APP_CATALOG_URL in variable group |
| Build fails at npm ci | Delete package-lock.json, regenerate locally, commit |
| "gulp is not recognized" | Add `npx` prefix: `npx gulp bundle --ship` |
| Pipeline can't access variable group | Authorize in Library > Variable group > Pipeline permissions |

---

## Security Best Practices

1. **Use certificate auth** instead of client secret for production
2. **Rotate secrets** every 12 months
3. **Limit app permissions** to minimum needed
4. **Enable approval gates** for production deployments
5. **Audit pipeline runs** regularly
6. **Use branch policies** - require PR reviews before merge to main

---

## Quick Reference

| Resource | URL |
|----------|-----|
| ADO Project | https://dev.azure.com/lebara/IT-Operations-Hub |
| App Catalog | https://lebara.sharepoint.com/sites/appcatalog |
| Entra App | Azure Portal > Entra ID > App registrations > SPFx-Pipeline-Deployment |
| Pipeline | ADO Project > Pipelines > spfx-itops-homepage |

