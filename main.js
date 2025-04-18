const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');

    // Create a separate window for DevTools
    let devToolsWindow = null;

    // Handle F12 key press
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12' && !input.control && !input.meta && !input.shift && !input.alt) {
            if (!devToolsWindow || devToolsWindow.isDestroyed()) {
                devToolsWindow = new BrowserWindow({
                    width: 1200,
                    height: 600
                });
                mainWindow.webContents.setDevToolsWebContents(devToolsWindow.webContents);
                mainWindow.webContents.openDevTools({ mode: 'detach' });
                devToolsWindow.on('closed', () => {
                    mainWindow.webContents.closeDevTools();
                    devToolsWindow = null;
                });
            } else {
                devToolsWindow.focus();
            }
        }
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (!result.canceled) {
        const folderPath = result.filePaths[0];
        handleFolderSelection(folderPath);
    }
});

ipcMain.on('mark-finished', async (event, data) => {
    try {
        const oldPath = data.path;
        const dirName = path.dirname(oldPath);
        const baseName = path.basename(oldPath);
        const newPath = path.join(dirName, `${baseName}-finished`);

        // Rename the directory
        fs.renameSync(oldPath, newPath);

        // Send the new path back to renderer
        event.reply('folder-marked-finished', newPath);
    } catch (error) {
        console.error('Error marking folder as finished:', error);
    }
});

ipcMain.on('update-json', async (event, data) => {
    try {
        const { path: folderPath, stepId, instruction } = data;
        const files = fs.readdirSync(folderPath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        // Find and update the JSON file containing the step
        for (const file of jsonFiles) {
            const filePath = path.join(folderPath, file);
            const jsonContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            if (jsonContent.steps) {
                const step = jsonContent.steps.find(s => s.step_id === stepId);
                if (step) {
                    step['low-level_instruction'] = instruction;
                    fs.writeFileSync(filePath, JSON.stringify(jsonContent, null, 2));
                    break;
                }
            }
        }
    } catch (error) {
        console.error('Error updating JSON:', error);
    }
});

function countFilesInParentDir(folderPath) {
    try {
        const parentDir = path.dirname(folderPath);
        const files = fs.readdirSync(parentDir);
        const finishedFiles = files.filter(file => file.endsWith('-finished'));
        return {
            total: files.length,
            finished: finishedFiles.length
        };
    } catch (error) {
        console.error('Error counting files in parent directory:', error);
        return {
            total: 0,
            finished: 0
        };
    }
}

function handleFolderSelection(folderPath) {
    try {
        const files = fs.readdirSync(folderPath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        const jsonData = [];
        const parentFileCount = countFilesInParentDir(folderPath);

        jsonFiles.forEach(file => {
            try {
                const filePath = path.join(folderPath, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                jsonData.push({
                    name: file,
                    data: data
                });
            } catch (error) {
                jsonData.push({
                    name: file,
                    error: error.message
                });
            }
        });

        mainWindow.webContents.send('folder-selected', {
            path: folderPath,
            jsonData: jsonData,
            parentFileCount: parentFileCount
        });
    } catch (error) {
        console.error('Error processing folder:', error);
    }
}