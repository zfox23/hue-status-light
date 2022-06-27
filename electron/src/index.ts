import { app, BrowserWindow, ipcMain } from 'electron';
import fetch from 'electron-fetch';
import { HUE_BRIDGE_IP, HUE_BRIDGE_USER, STATUS_LIGHT_NAMES } from './hueInfo';
require('dotenv').config();
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    // eslint-disable-line global-require
    app.quit();
}

let mainWindow: BrowserWindow;
const createWindow = (): void => {
    mainWindow = new BrowserWindow({
        height: 600,
        width: 800,
        webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
        }
    });
    mainWindow.removeMenu();

    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

const onReady = () => {
    createWindow();
    getLightInfo();
}
app.on('ready', onReady);

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

let relevantLightIDs: Array<string>;
const getLightInfo = async () => {
    console.log(`Getting relevant Light IDs from Hue bridge at \`${HUE_BRIDGE_IP}\`...`);
    relevantLightIDs = [];
    try {
        const response = await fetch(`http://${HUE_BRIDGE_IP}/api/${HUE_BRIDGE_USER}/lights`);
        const lightsJSON: any = await response.json();
        const keys = Object.keys(lightsJSON);
        for (let i = 0; i < keys.length; i++) {
            if (STATUS_LIGHT_NAMES.includes(lightsJSON[keys[i]].name)) {
                relevantLightIDs.push(keys[i]);
            }
        }
        console.log(`Got relevant Light IDs:\n${JSON.stringify(relevantLightIDs)}`);
    } catch (err) {
        console.error(err);
    }
}

import { LightState, BUSY_LIGHT_STATE, UNCERTAIN_LIGHT_STATE, FREE_LIGHT_STATE, NORMAL_LIGHT_STATE, OFF_LIGHT_STATE } from './lightStates';
const setLightState = async (newLightState: LightState) => {
    if (!(relevantLightIDs && relevantLightIDs.length)) {
        console.error(`No light info available!`);
        return false;
    }

    let failed = false;
    relevantLightIDs.forEach(async (lightID) => {
        const url = `http://${HUE_BRIDGE_IP}/api/${HUE_BRIDGE_USER}/lights/${lightID}/state`;
        const body = JSON.stringify(newLightState);
        failed = failed || !(await fetch(url, {
            method: 'put',
            body
        }));
    });

    if (failed) {
        return undefined;
    } else {
        return newLightState;
    }
}

ipcMain.handle('setLightState', async (event, arg) => {
    let result = undefined;
    switch (arg) {
        case "off":
            result = await setLightState(OFF_LIGHT_STATE);
            break;
        case "normal":
            result = await setLightState(NORMAL_LIGHT_STATE);
            break;
        case "free":
            result = await setLightState(FREE_LIGHT_STATE);
            break;
        case "uncertain":
            result = await setLightState(UNCERTAIN_LIGHT_STATE);
            break;
        case "busy":
            result = await setLightState(BUSY_LIGHT_STATE);
            break;
        default:
            console.warn(`\`setLightState()\` called with unknown argument:\n${arg}`);
            break;
    }

    return result;
});

ipcMain.handle('getCurrentLightState', async (event, arg) => {
    if (!(relevantLightIDs && relevantLightIDs.length)) {
        return undefined;
    }

    try {
        const response = await fetch(`http://${HUE_BRIDGE_IP}/api/${HUE_BRIDGE_USER}/lights/${relevantLightIDs[0]}`);
        const lightsJSON = await response.json();
        return lightsJSON.state;
    } catch (err) {
        console.error(err);
    }

    return undefined;
});
