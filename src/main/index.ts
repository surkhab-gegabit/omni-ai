import path from 'path'
// We use require here to bypass TypeScript strict-mode complaints for these specific plugins
const { chromium } = require('playwright-extra')
const stealth = require('puppeteer-extra-plugin-stealth')()
chromium.use(stealth)

import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
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

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // --- OMNIAI AUTO-ROUTER ENGINE ---
  ipcMain.handle('send-prompt', async (_, payload) => {
    const { promptText, model } = payload;
    const userDataDir = path.join(app.getPath('userData'), 'omni-browser-data');
    console.log(`🤖 Routing to ${model}: ${promptText}`);

    let context: any = null; // Declare context outside so 'finally' can access it

    try {
      context = await chromium.launchPersistentContext(userDataDir, {
        headless: false, 
        // 🚨 TEMPORARY: Change to '0,0' to log in. Change back to '-32000,-32000' after!
        args: ['--window-position=0,0'], 
        channel: 'chrome',
        ignoreDefaultArgs: ['--enable-automation']
      });

      const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
      let textOutput = "Error: Engine routing failed.";

      // 🔀 THE SWITCHBOARD V3 (Strict-Mode Bypass & Button Clicks)
      switch (model) {
        case 'chatgpt':
          await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });
          const gptInput = '#prompt-textarea'; 
          await page.waitForSelector(gptInput, { timeout: 15000 });
          await page.locator(gptInput).first().focus(); // Added .first() for safety
          await page.keyboard.insertText(promptText);
          await page.keyboard.press('Enter');
          
          await page.waitForTimeout(10000); 
          
          const gptResponses = await page.$$('.markdown');
          if (gptResponses.length > 0) {
            textOutput = await gptResponses[gptResponses.length - 1].innerText();
          } else {
            textOutput = "Engine Error: Could not find ChatGPT's response class on the page.";
          }
          break;

        case 'claude':
          await page.goto('https://claude.ai/new', { waitUntil: 'domcontentloaded' });
          const claudeInput = 'div[contenteditable="true"]'; 
          await page.waitForSelector(claudeInput, { timeout: 15000 });
          await page.locator(claudeInput).first().focus();
          await page.keyboard.insertText(promptText);
          await page.waitForTimeout(500);
          
          // Try clicking the Send button directly if Enter fails
          try {
            await page.locator('button[aria-label="Send Message"]').click({ timeout: 2000 });
          } catch {
            await page.keyboard.press('Enter'); // Fallback
          }
          
          await page.waitForTimeout(10000);
          
          // Claude's container classes are notoriously volatile. 
          const claudeResponses = await page.$$('.font-claude-message, .prose, [data-test-render-count]'); 
          if (claudeResponses.length > 0) {
            textOutput = await claudeResponses[claudeResponses.length - 1].innerText();
          } else {
             textOutput = "Engine Error: Could not find Claude's response class on the page.";
          }
          break;

        case 'gemini':
          await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded' });
          // Fixed Strict Mode: Target specifically the inner editor and use .first()
          const geminiInput = '.ql-editor'; 
          await page.waitForSelector(geminiInput, { timeout: 15000 });
          await page.locator(geminiInput).first().focus();
          
          // Clear any existing text just in case, then type
          await page.keyboard.insertText(promptText);
          await page.waitForTimeout(500);
          
          await page.keyboard.press('Enter'); 
          
          await page.waitForTimeout(10000);
          
          const geminiResponses = await page.$$('model-response, .message-content'); 
          if (geminiResponses.length > 0) {
            textOutput = await geminiResponses[geminiResponses.length - 1].innerText();
          } else {
             textOutput = "Engine Error: Could not find Gemini's response class on the page.";
          }
          break;

        default:
          textOutput = "Unknown engine selected.";
      }

      return textOutput;

    } catch (error) {
      console.error(error);
      if (error instanceof Error) return "Engine Error: " + error.message;
      return "Engine Error: " + String(error);
    } finally {
      // 🛡️ THE BULLETPROOF SHIELD: Always close the browser, even on errors
      if (context) {
        console.log("🧹 Cleaning up browser context...");
        await context.close();
      }
    }
  });
  

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})