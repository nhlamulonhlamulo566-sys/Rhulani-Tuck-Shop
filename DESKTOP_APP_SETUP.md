# Rhulani Tuck Shop - Desktop App Setup Guide

This guide covers setting up and using the Rhulani Tuck Shop as a standalone desktop application on Windows, Mac, or Linux.

## Installation

### Windows
1. Download `rhulani-tuck-shop-Setup-1.0.0.exe` from releases
2. Run the installer
3. Follow the setup wizard
4. App launches automatically

### Mac
1. Download `rhulani-tuck-shop-1.0.0.dmg` from releases
2. Open the DMG file
3. Drag the app to the Applications folder
4. Launch from Applications

### Linux
1. Download `rhulani-tuck-shop-1.0.0.AppImage` from releases
2. Make it executable: `chmod +x rhulani-tuck-shop-1.0.0.AppImage`
3. Run: `./rhulani-tuck-shop-1.0.0.AppImage`

## Requirements

### Windows & Mac & Linux
- **MySQL 8.0** (automatically included in installer, or install from [mysql.com](https://dev.mysql.com/downloads/mysql/))
- **Minimum 500MB** disk space
- **4GB RAM** recommended

## First Run Setup

When you launch the app for the first time:

1. **Database Initialization**
   - The app checks for MySQL
   - Creates the database automatically
   - Initializes all required tables

2. **Login**
   - Default admin PIN: `0000` (change in settings)
   - Create your first user account

3. **Store Configuration**
   - Set store name
   - Configure shop hours
   - Add initial products

## Building Installers

### For Developers

```bash
# Build for Windows
npm run electron-build-win

# Build for Mac
npm run electron-build-mac

# Build for Linux
npm run electron-build-linux

# Build for all platforms
npm run electron-build
```

Installers will be in the `dist/` folder.

## Troubleshooting

### "MySQL not found"
1. Verify MySQL is installed: `mysql --version`
2. If not installed, download from [mysql.com](https://dev.mysql.com/downloads/mysql/)
3. Restart the app

### "Database connection failed"
1. Check MySQL is running (Windows: Services, Mac: System Preferences > MySQL)
2. Verify credentials in app settings
3. Restart the app

### "App won't start"
1. Check logs in `%APPDATA%\Rhulani Tuck Shop\logs/` (Windows)
2. Try uninstalling and reinstalling
3. Ensure MySQL is running

## Updates

The app automatically checks for updates on startup. When an update is available:
1. You'll see an update notification
2. Click "Install Now" or update later
3. App restarts with new version

## Offline Use

The app works completely offline after the initial setup. All data is stored locally in MySQL.

## Uninstalling

### Windows
- Use Control Panel > Programs > Uninstall
- Or right-click installer and choose "Uninstall"

### Mac
- Drag app from Applications to Trash

### Linux
- Delete the AppImage file

---

**Need Help?** Contact support or check the FAQ at [github.com/rhulani-tuck-shop](https://github.com/nhlamulonhlamulo566-sys/Rhulani-Tuck-Shop)
