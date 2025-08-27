# GitHub Actions CI/CD Pipeline

This directory contains the GitHub Actions workflows for the EV-DB project's CI/CD pipeline.

## 🚀 Workflows

### [`ci.yml`](workflows/ci.yml) - Main CI/CD Pipeline
**Triggers**: Push to main/develop, Pull Requests  
**Purpose**: Core build, test, and quality checks

- ✅ Build & Test (Node.js 18, 20)
- ✅ TypeScript compilation
- ✅ ESLint linting
- ✅ Unit & Integration tests
- ✅ Test coverage reporting
- ✅ Bundle size analysis
- 📝 Automated PR comments

### [`security.yml`](workflows/security.yml) - Security Scanning
**Triggers**: Push, Pull Requests, Daily schedule  
**Purpose**: Comprehensive security analysis

- 🔍 CodeQL static analysis
- 🛡️ Dependency vulnerability scanning
- 🔐 Secret detection
- 📄 License compliance checking
- 📊 Security summary reports

### [`performance.yml`](workflows/performance.yml) - Performance & Accessibility
**Triggers**: Push to main/develop, Pull Requests  
**Purpose**: Performance monitoring and accessibility compliance

- ⚡ Lighthouse CI audits
- 📦 Bundle size tracking
- 🏃 Performance regression tests
- ♿ WCAG 2.1 AA accessibility testing

### [`release.yml`](workflows/release.yml) - Release Pipeline
**Triggers**: Git tags (v*), Manual dispatch  
**Purpose**: Automated release management

- 🏷️ Version validation
- 📦 Build release artifacts
- 📝 Changelog generation (integrates with Git changelog system)
- 🚀 GitHub release creation
- 📢 Post-release notifications

### [`dependency-update.yml`](workflows/dependency-update.yml) - Dependency Management
**Triggers**: Weekly schedule, Manual dispatch  
**Purpose**: Automated dependency maintenance

- 🔄 Weekly dependency updates
- 🔒 Security audit reports
- 📋 Automated PR creation
- 🚨 Security issue alerts

## 🛠️ Quick Setup

1. **Enable Actions**: Repository Settings → Actions → Allow all actions
2. **Add Secrets** (optional): Settings → Secrets → Add `SNYK_TOKEN`
3. **Branch Protection**: Settings → Branches → Protect `main` branch
4. **First Run**: Push changes to trigger pipeline

## 📊 Status Badges

Add these badges to your README.md:

```markdown
[![CI/CD Pipeline](https://github.com/YOUR_USERNAME/ev-db/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/ev-db/actions/workflows/ci.yml)
[![Security Scan](https://github.com/YOUR_USERNAME/ev-db/actions/workflows/security.yml/badge.svg)](https://github.com/YOUR_USERNAME/ev-db/actions/workflows/security.yml)
[![Performance](https://github.com/YOUR_USERNAME/ev-db/actions/workflows/performance.yml/badge.svg)](https://github.com/YOUR_USERNAME/ev-db/actions/workflows/performance.yml)
```

## 🔧 Configuration Files

- **`.lighthouserc.json`** - Lighthouse CI configuration
- **`packages/*/vitest.config.ts`** - Test coverage settings
- **`packages/*/.eslintrc.cjs`** - Linting rules

## 📚 Documentation

For detailed information, see [CI/CD Pipeline Documentation](../docs/CI_CD_PIPELINE.md).

## 🎯 Quality Gates

### Required Checks for PR Merging
- ✅ Build & Test (Node.js 18)
- ✅ Code Quality & Security
- ✅ Performance & Accessibility (main branch)

### Coverage Thresholds
- **Frontend**: 70% (branches, functions, lines, statements)
- **Backend**: 60% (branches, functions, lines, statements)

### Performance Thresholds
- **Lighthouse Performance**: 80%
- **Lighthouse Accessibility**: 90%
- **Page Load Time**: < 5 seconds
- **API Response Time**: < 2 seconds

## 🚨 Troubleshooting

### Common Issues
1. **Build Failures**: Check Node.js/pnpm versions match requirements
2. **Test Failures**: Review test logs in workflow artifacts
3. **Security Alerts**: Update vulnerable dependencies
4. **Performance Issues**: Check Lighthouse reports in artifacts

### Getting Help
1. Check workflow logs in the Actions tab
2. Download artifacts for detailed reports
3. Review the [troubleshooting guide](../docs/CI_CD_PIPELINE.md#troubleshooting)

## 🔄 Maintenance

### Weekly Tasks
- Review dependency update PRs
- Check security scan results

### Monthly Tasks
- Review performance trends
- Update workflow dependencies

### Quarterly Tasks
- Review and adjust quality thresholds
- Update action versions to latest

---

*This CI/CD pipeline ensures code quality, security, and performance standards for the EV-DB project.*
