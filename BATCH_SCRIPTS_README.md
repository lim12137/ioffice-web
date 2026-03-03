# AionUi WebUI Batch Scripts - User Guide

## Overview

This directory contains **4 essential batch scripts** to manage AionUi WebUI service. All scripts use English-only text to avoid encoding issues.

---

## 📜 Available Scripts

| # | Script Name | Function | Description | Priority |
|---|-------------|----------|-------------|
| 1 | **restart-webui.bat** | **Stop and Restart** ⭐⭐⭐⭐ | **Main script for daily use** |
| 2 | **start-webui.bat** | Start Service | Start WebUI when stopped |
| 3 | **stop-webui.bat** | Stop Service | Stop running WebUI |
| 4 | **reset-password.bat** | Reset Password | Reset admin password |

---

## 🚀 Quick Start

### For Daily Use (Recommended)

```
Double-click: restart-webui.bat
```

**What it does:**
1. Stops all Node processes
2. Waits 2 seconds
3. Starts WebUI service
4. Opens browser at http://localhost:3000

---

## 📋 Detailed Usage

### 1. restart-webui.bat ⭐ MAIN SCRIPT

**Purpose:** Stop and restart WebUI service

**Usage:**
- Double-click to run
- Or run from command line: `restart-webui.bat`

**Process:**
```
========================================
   Stop and Restart AionUi
========================================

Step 1: Killing Node processes...
Step 2: Waiting 2 seconds...
Step 3: Starting WebUI...

Access: http://localhost:3000

Starting...
```

**When to use:**
- ✅ After modifying `webui.config.json`
- ✅ After updating dependencies
- ✅ When service is not responding
- ✅ Any time you need to restart

**Why this is best:**
- ✅ Simple and reliable
- ✅ No complex port detection
- ✅ Works in all scenarios
- ✅ No encoding issues

---

### 2. start-webui.bat

**Purpose:** Start WebUI service

**Usage:**
- Double-click to run
- Or run from command line: `start-webui.bat`

**Process:**
```
========================================
   AionUi WebUI Start Script
========================================

Starting AionUi WebUI...
Access URL: http://localhost:3000
Press Ctrl+C to stop service

Starting...
```

**When to use:**
- ✅ After service was stopped
- ✅ First time setup
- ✅ When restart-webui.bat doesn't work

---

### 3. stop-webui.bat

**Purpose:** Stop running WebUI service

**Usage:**
- Double-click to run
- Or run from command line: `stop-webui.bat`

**Process:**
```
========================================
   AionUi WebUI Stop Script
========================================

[INFO] Found running process PID: xxx
[INFO] Stopping process...
[OK] Process stopped successfully
```

**When to use:**
- ✅ Need to stop service completely
- ✅ Before updating files
- ✅ Before changing configuration

---

### 4. reset-password.bat

**Purpose:** Reset admin password to a new random password

**Usage:**
- Double-click to run
- Or run from command line: `reset-password.bat`

**Process:**
```
========================================
   AionUi Reset Admin Password
========================================

Resetting admin password...

After reset, a new random password will be generated
Please copy the new password from terminal output

[INFO] New password: abc123def456
```

**When to use:**
- ✅ Forgot admin password
- ✅ Login fails with known password
- ✅ Need to secure a compromised account

**Important:**
- ⚠️ Copy the new password immediately
- ⚠️ The password is only shown once
- ⚠️ All existing sessions will be invalid

---

## 🌐 Access URLs

### Local Access
```
http://localhost:3000
```

### Network Access (if enabled in config)
```
http://192.168.8.101:3000
```
Replace with your actual IP address.

---

## 🔧 Configuration

### Config File Location
```
webui.config.json
```

### Current Configuration
```json
{
  "port": 3000,
  "allowRemote": true,
  "adminUsername": "admin",
  "adminPassword": "admin123456"
}
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|----------|
| `port` | WebUI listening port | 3000 |
| `allowRemote` | Allow LAN access | true |
| `adminUsername` | Admin username | admin |
| `adminPassword` | Admin password | admin123456 |

### Changing Configuration

1. Edit `webui.config.json`
2. Run `restart-webui.bat`
3. Wait for service to start (~15 seconds)
4. Refresh browser

---

## 🔄 Workflow Examples

### Scenario 1: Modify Configuration and Restart

```
1. Edit webui.config.json
2. Double-click: restart-webui.bat
3. Wait for "Starting..." message
4. Open browser: http://localhost:3000
```

### Scenario 2: Password Reset

```
1. Double-click: reset-password.bat
2. Wait for new password display
3. Copy the password
4. Login with new password
5. Change password in settings (recommended)
```

### Scenario 3: Manual Stop and Start

```
1. Double-click: stop-webui.bat
2. Confirm process stopped
3. Double-click: start-webui.bat
4. Wait for startup to complete
```

---

## 🛠️ Troubleshooting

### Problem: Script shows encoding errors

**Symptoms:** `'AionUi' is not recognized`

**Solution:** All scripts now use English-only text ✅
**If still occurs:**
- Right-click script → Properties → Unblock
- Run as Administrator

---

### Problem: Port still in use after stopping

**Symptoms:** Service fails to start, says port is in use

**Solution:**
1. Double-click `stop-webui.bat`
2. Wait 10 seconds
3. Check with command: `netstat -ano | findstr :3000`
4. If still in use, reboot computer

---

### Problem: "npm is not recognized"

**Symptoms:** Script fails with npm not found

**Solution:**
1. Verify Node.js is installed
2. Check npm is in PATH
3. Run: `npm --version`
4. If fails, reinstall Node.js

---

### Problem: Cannot login after restart

**Symptoms:** Always get 401/403 errors

**Solution:**
1. Try default credentials: `admin / admin123456`
2. If still fails, run: `reset-password.bat`
3. Login with new password
4. Clear browser cache (Ctrl+Shift+Delete)

---

### Problem: Service starts but browser shows connection error

**Symptoms:** Service running but can't access from browser

**Solution:**
1. Check service is running: `netstat -ano | findstr :3000`
2. Try: `http://127.0.0.1:3000` instead of `localhost`
3. Check firewall settings
4. Try different browser
5. Clear browser cache

---

## 💡 Tips

### Create Desktop Shortcut

1. Right-click `restart-webui.bat`
2. Send to → Desktop (create shortcut)
3. Now you can restart from desktop

### Auto-start on Windows Boot

1. Copy `start-webui.bat` to:
   ```
   C:\Users\YourName\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
   ```
2. WebUI will start automatically on boot

### Run as Administrator (if needed)

1. Right-click script
2. Run as Administrator

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `webui.config.json` | Main configuration file |
| `BATCH_SCRIPTS_README.md` | This file - batch scripts guide |
| `WEBUI_GUIDE.md` | WebUI detailed configuration guide |
| `readme.md` | Project README |

---

## 📊 Script Comparison Summary

| Feature | Best Script | Alternative | Why Chosen |
|---------|-------------|--------------|-------------|
| **Restart Service** | restart-webui.bat | - | Simplest, most reliable |
| **Start Service** | start-webui.bat | - | Clean startup |
| **Stop Service** | stop-webui.bat | - | Proper process cleanup |
| **Reset Password** | reset-password.bat | - | Only password reset tool |

---

## ✅ Best Practices

### Daily Use

```
Always use: restart-webui.bat
```

### When Stopping Service

```
Use: stop-webui.bat (clean stop)
```

### When Password Issues

```
Use: reset-password.bat (immediate reset)
```

### First Time Setup

```
1. Edit webui.config.json
2. Double-click: restart-webui.bat
3. Wait for startup
4. Login: admin / admin123456
```

---

## 🎯 Quick Reference

| Need to... | Use this script |
|-------------|-----------------|
| **Restart everything** | `restart-webui.bat` ⭐ |
| **Start from scratch** | `start-webui.bat` |
| **Stop cleanly** | `stop-webui.bat` |
| **Reset password** | `reset-password.bat` |

---

## 🆘 Support

If you encounter issues not covered here:

1. Check main README: `readme.md`
2. Check WebUI guide: `WEBUI_GUIDE.md`
3. Search project issues on GitHub
4. Check console output for error messages

---

## 📝 Summary

**Total scripts:** 4 (essential only)
**Language:** English (no encoding issues)
**Complexity:** Simple and reliable
**Status:** ✅ **READY TO USE**

---

**Recommendation:** Create a desktop shortcut to `restart-webui.bat` for easiest daily use! 🚀
