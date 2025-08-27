# GitHub Actions Error Collection Script - Latest Commit Only
# This script collects error logs from the latest commit's workflow runs

param(
    [string]$OutputDir = "github-errors"
)

Write-Host "Collecting GitHub Actions errors for latest commit..." -ForegroundColor Cyan

# Check if GitHub CLI is installed
if (!(Get-Command "gh" -ErrorAction SilentlyContinue)) {
    Write-Host "GitHub CLI (gh) is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "  winget install GitHub.cli" -ForegroundColor Yellow
    Write-Host "  or download from: https://cli.github.com/" -ForegroundColor Yellow
    exit 1
}

# Check if authenticated
try {
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Please authenticate with GitHub CLI first:" -ForegroundColor Red
        Write-Host "  gh auth login" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "Please authenticate with GitHub CLI first:" -ForegroundColor Red
    Write-Host "  gh auth login" -ForegroundColor Yellow
    exit 1
}

# Clean and create output directory
if (Test-Path $OutputDir) {
    Write-Host "Cleaning previous error logs..." -ForegroundColor Yellow
    Remove-Item -Path "$OutputDir\*" -Force -Recurse
} else {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# Get the latest commit SHA
Write-Host "Getting latest commit..." -ForegroundColor Yellow
try {
    $latestCommit = gh api repos/:owner/:repo/commits/main | ConvertFrom-Json
    $commitSha = $latestCommit.sha
    $commitMessage = $latestCommit.commit.message.Split("`n")[0]  # First line only
    Write-Host "Latest commit: $($commitSha.Substring(0,8)) - $commitMessage" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to get latest commit: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Get workflow runs for the latest commit only
Write-Host "Fetching workflow runs for latest commit..." -ForegroundColor Yellow
try {
    $runs = gh run list --commit $commitSha --json databaseId,status,conclusion,workflowName,createdAt,headBranch | ConvertFrom-Json
} catch {
    Write-Host "Failed to get workflow runs: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

if ($runs.Count -eq 0) {
    Write-Host "No workflow runs found for the latest commit." -ForegroundColor Red
    exit 1
}

Write-Host "Found $($runs.Count) workflow runs for latest commit. Collecting logs..." -ForegroundColor Yellow

$errorSummary = @{}

# Process all workflow runs for the latest commit (not just failed ones)
foreach ($run in $runs) {
    $runId = $run.databaseId
    $workflowName = $run.workflowName
    $safeWorkflowName = $workflowName -replace '[^\w\-_\.]', '_'

    Write-Host "  Processing: $workflowName (Run #$runId) - Status: $($run.status) - Conclusion: $($run.conclusion)" -ForegroundColor Gray

    try {
        # Get the full log for this run
        $logContent = gh run view $runId --log 2>&1

        if ($LASTEXITCODE -eq 0) {
            # Save full log
            $logFile = Join-Path $OutputDir "$safeWorkflowName-$runId-full.log"
            $logContent | Out-File -FilePath $logFile -Encoding UTF8

            # Extract errors, warnings, and TypeScript errors
            $errorLines = $logContent | Where-Object {
                ($_ -match "##\[error\]" -or
                 $_ -match "##\[warning\]" -or
                 $_ -match "error TS\d+" -or
                 $_ -match "Error:" -or
                 $_ -match "Failed" -or
                 $_ -match "FAIL" -or
                 $_ -match "✗" -or
                 $_ -match "❌" -or
                 $_ -match "npm ERR!" -or
                 $_ -match "pnpm ERR!" -or
                 $_ -match "Command failed") -and
                $_ -notmatch "##\[debug\]"
            }

            if ($errorLines -and $errorLines.Count -gt 0) {
                $errorFile = Join-Path $OutputDir "$safeWorkflowName-$runId-errors.txt"

                # Add context header to error file
                $errorHeader = @"
Workflow: $workflowName
Run ID: $runId
Commit: $($commitSha.Substring(0,8)) - $commitMessage
Status: $($run.status) - $($run.conclusion)
Created: $($run.createdAt)
==================================================

"@

                ($errorHeader + ($errorLines -join "`n")) | Out-File -FilePath $errorFile -Encoding UTF8

                # Add to summary
                if (-not $errorSummary.ContainsKey($workflowName)) {
                    $errorSummary[$workflowName] = @()
                }
                $errorSummary[$workflowName] += @{
                    RunId = $runId
                    ErrorCount = $errorLines.Count
                    ErrorFile = $errorFile
                    LogFile = $logFile
                    CreatedAt = $run.createdAt
                    Status = $run.status
                    Conclusion = $run.conclusion
                }

                Write-Host "    Saved $($errorLines.Count) errors to $errorFile" -ForegroundColor Green
            } else {
                Write-Host "    No errors found in this run" -ForegroundColor Green
            }
        } else {
            Write-Host "    Failed to get logs for run $runId" -ForegroundColor Red
        }
    } catch {
        Write-Host "    Error processing run $runId : $_" -ForegroundColor Red
    }
}

# Create summary report
$summaryFile = Join-Path $OutputDir "error-summary.txt"
$summaryContent = @()
$summaryContent += "GitHub Actions Error Summary - Latest Commit"
$summaryContent += "Generated: $(Get-Date)"
$summaryContent += "Commit: $($commitSha.Substring(0,8)) - $commitMessage"
$summaryContent += "=" * 60
$summaryContent += ""

$totalErrors = 0
if ($errorSummary.Keys.Count -gt 0) {
    foreach ($workflow in $errorSummary.Keys | Sort-Object) {
        $workflowErrors = $errorSummary[$workflow]
        $workflowErrorCount = 0
        foreach ($runInfo in $workflowErrors) {
            $workflowErrorCount += $runInfo.ErrorCount
        }
        $totalErrors += $workflowErrorCount

        $summaryContent += "WORKFLOW: $workflow"
        $summaryContent += "Total Errors: $workflowErrorCount"
        $summaryContent += ""

        foreach ($runInfo in $workflowErrors) {
            $summaryContent += "  Run #$($runInfo.RunId) - $($runInfo.ErrorCount) errors"
            $summaryContent += "    Status: $($runInfo.Status) - $($runInfo.Conclusion)"
            $summaryContent += "    Created: $($runInfo.CreatedAt)"
            $summaryContent += "    Error File: $($runInfo.ErrorFile)"
            $summaryContent += "    Full Log: $($runInfo.LogFile)"
            $summaryContent += ""
        }
        $summaryContent += "-" * 30
        $summaryContent += ""
    }
} else {
    $summaryContent += "No errors found in any workflow runs for this commit!"
    $summaryContent += ""
}

$summaryContent += "TOTAL ERRORS ACROSS ALL WORKFLOWS: $totalErrors"

$summaryContent | Out-File -FilePath $summaryFile -Encoding UTF8

# Display summary
Write-Host "`nError Collection Complete!" -ForegroundColor Green
Write-Host "Commit: $($commitSha.Substring(0,8)) - $commitMessage" -ForegroundColor Cyan
Write-Host "Total Errors Found: $totalErrors" -ForegroundColor Cyan
Write-Host "Files saved to: $OutputDir" -ForegroundColor Cyan

if ($errorSummary.Keys.Count -gt 0) {
    Write-Host "`nSummary by workflow:" -ForegroundColor Yellow
    foreach ($workflow in $errorSummary.Keys | Sort-Object) {
        $workflowErrorCount = 0
        foreach ($runInfo in $errorSummary[$workflow]) {
            $workflowErrorCount += $runInfo.ErrorCount
        }
        Write-Host "  $workflow : $workflowErrorCount errors" -ForegroundColor White
    }

    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Review the summary file: $summaryFile" -ForegroundColor White
    Write-Host "2. Share the error files with your AI assistant" -ForegroundColor White
    Write-Host "3. The assistant can analyze and fix all issues systematically" -ForegroundColor White
} else {
    Write-Host "`n🎉 Great news! No errors found in the latest commit's workflows!" -ForegroundColor Green
    Write-Host "All workflows appear to be running successfully." -ForegroundColor Green
}
