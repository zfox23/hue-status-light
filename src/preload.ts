import { contextBridge, ipcRenderer } from 'electron';

/**
 * Render --> Main
 * ---------------
 * Render:  window.ipcRender.send('channel', data); // Data is optional.
 * Main:    ipcMain.on('channel', (event, data) => { methodName(data); })
 *
 * Main --> Render
 * ---------------
 * Main:    windowName.webContents.send('channel', data); // Data is optional.
 * Render:  window.ipcRender.receive('channel', (data) => { methodName(data); });
 *
 * Render --> Main (Value) --> Render
 * ----------------------------------
 * Render:  window.ipcRender.invoke('channel', data).then((result) => { methodName(result); });
 * Main:    ipcMain.handle('channel', (event, data) => { return someMethod(data); });
 *
 * Render --> Main (Promise) --> Render
 * ------------------------------------
 * Render:  window.ipcRender.invoke('channel', data).then((result) => { methodName(result); });
 * Main:    ipcMain.handle('channel', async (event, data) => {
 *              return await promiseName(data)
 *                  .then(() => { return result; })
 *          });
 */

// White-listed channels.
const ipc: any = {
    'render': {
        // From render to main.
        'send': [],
        // From main to render.
        'receive': [],
        // From render to main and back again.
        'sendReceive': [
            'setLightState', // Channel name
            'getCurrentLightState'
        ],
    }
};

// Exposed protected methods in the render process.
contextBridge.exposeInMainWorld(
    // Allowed 'ipcRenderer' methods.
    'ipcRender', {
    // From render to main.
    send: (channel: any, args: any) => {
        let validChannels = ipc.render.send;
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, args);
        }
    },
    // From main to render.
    receive: (channel: any, listener: any) => {
        let validChannels = ipc.render.receive;
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`.
            ipcRenderer.on(channel, (event, ...args) => listener(...args));
        }
    },
    // From render to main and back again.
    invoke: (channel: any, args: any) => {
        let validChannels = ipc.render.sendReceive;
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, args);
        }
    }
});
