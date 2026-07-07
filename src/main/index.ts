import path from 'path'
import os from 'os' // <-- 1. IMPORT NODE'S NATIVE OS MODULE
// We use require here to bypass TypeScript strict-mode complaints for these specific plugins
const { chromium } = require('playwright-extra')
const stealth = require('puppeteer-extra-plugin-stealth')()
chromium.use(stealth)

import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    
    titleBarStyle: 'hiddenInset',
    backgroundMaterial: 'acrylic',
    backgroundColor: '#00000000',
    transparent: true,

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  
  return mainWindow;
}

// --- HARDWARE MATH HELPER ---
function getCpuUsage() {
  const cpus = os.cpus();
  let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
  for (let cpu in cpus) {
    user += cpus[cpu].times.user;
    nice += cpus[cpu].times.nice;
    sys += cpus[cpu].times.sys;
    idle += cpus[cpu].times.idle;
    irq += cpus[cpu].times.irq;
  }
  return { idle, total: user + nice + sys + idle + irq };
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const mainWindow = createWindow();

  // --- 2. THE TELEMETRY BROADCASTER ---
  let startMeasure = getCpuUsage();
  
  setInterval(() => {
    // Calculate CPU %
    const endMeasure = getCpuUsage();
    const idleDifference = endMeasure.idle - startMeasure.idle;
    const totalDifference = endMeasure.total - startMeasure.total;
    const percentageCpu = 100 - ~~(100 * idleDifference / totalDifference);
    startMeasure = endMeasure;

    // Calculate RAM %
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramPercentage = Math.round((usedMem / totalMem) * 100);

    // Broadcast to the frontend safely
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('hardware-telemetry', {
        cpu: percentageCpu,
        ram: ramPercentage
      });
    }
  }, 1000); // Updates exactly once per second


  // --- CUSTOM WINDOW CONTROLS ---
  ipcMain.on('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.on('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  ipcMain.on('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  // --- OMNIAI AUTO-ROUTER ENGINE ---
  ipcMain.handle('send-prompt', async (_, payload) => {
    const { promptText, model } = payload;
    console.log(`🤖 Routing to ${model}: ${promptText}`);

    // 1. OFFLINE LOCAL ENGINE (Llama 3)
    if (model === 'local-llama') {
      try {
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3',
            prompt: promptText,
            stream: false
          })
        });
        
        const data = await response.json();
        return data.response;
      } catch (error) {
        return "System Error: Local Llama engine is offline. Please ensure Ollama is running in the background.";
      }
    }

    // 2. CLOUD ENGINES (ChatGPT, Claude, Gemini)
    const userDataDir = path.join(app.getPath('userData'), 'omni-browser-data');
    let context: any = null;

    try {
      context = await chromium.launchPersistentContext(userDataDir, {
        headless: false, 
        args: ['--window-position=0,0'], 
        channel: 'chrome',
        ignoreDefaultArgs: ['--enable-automation']
      });

      const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
      let textOutput = "Error: Engine routing failed.";

      switch (model) {
        case 'chatgpt':
          await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });
          const gptInput = '#prompt-textarea'; 
          await page.waitForSelector(gptInput, { timeout: 15000 });
          await page.locator(gptInput).first().focus();
          await page.keyboard.insertText(promptText);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(10000); 
          const gptResponses = await page.$$('.markdown');
          if (gptResponses.length > 0) textOutput = await gptResponses[gptResponses.length - 1].innerText();
          break;

        case 'claude':
          await page.goto('https://claude.ai/new', { waitUntil: 'domcontentloaded' });
          const claudeInput = 'div[contenteditable="true"]'; 
          await page.waitForSelector(claudeInput, { timeout: 15000 });
          await page.locator(claudeInput).first().focus();
          await page.keyboard.insertText(promptText);
          await page.waitForTimeout(500);
          try { await page.locator('button[aria-label="Send Message"]').click({ timeout: 2000 }); } 
          catch { await page.keyboard.press('Enter'); }
          await page.waitForTimeout(10000);
          const claudeResponses = await page.$$('.font-claude-message, .prose, [data-test-render-count]'); 
          if (claudeResponses.length > 0) textOutput = await claudeResponses[claudeResponses.length - 1].innerText();
          break;

        case 'gemini':
          await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded' });
          const geminiInput = '.ql-editor'; 
          await page.waitForSelector(geminiInput, { timeout: 15000 });
          await page.locator(geminiInput).first().focus();
          await page.keyboard.insertText(promptText);
          await page.waitForTimeout(500);
          await page.keyboard.press('Enter'); 
          await page.waitForTimeout(10000);
          const geminiResponses = await page.$$('model-response, .message-content'); 
          if (geminiResponses.length > 0) textOutput = await geminiResponses[geminiResponses.length - 1].innerText();
          break;

        default:
          textOutput = "Unknown engine selected.";
      }

      return textOutput;
    } catch (error) {
      if (error instanceof Error) return "Engine Error: " + error.message;
      return "Engine Error: " + String(error);
    } finally {
      if (context) await context.close();
    }
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})