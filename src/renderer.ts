/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *    // Create the browser window.
 *    mainWindow = new BrowserWindow({
 *        width: 800,
 *        height: 600,
 *        webPreferences: {
 *            nodeIntegration: true
 *        }
 *    });
 * ```
 */

declare const ipcRender: any;
import './index.css';
import { LightState } from './lightStates';

const setCurrentColorEl = (result: LightState) => {
    console.log(result)
    const currentColor: HTMLDivElement = document.querySelector(".currentColor");
    if (!result.on) {
        currentColor.style.backgroundColor = "#000000";
    } else if (result.colormode === "ct" && result.ct) {
        currentColor.style.backgroundColor = "#fff3c9";
    } else if (result.on) {
        const temp = `hsl(${Math.round(linearScale(result.hue, 0, 65535, 0, 360))}deg, ${result.sat / 254 * 100}%, 50%)`;
        currentColor.style.backgroundColor = temp;
    } else {
        currentColor.style.backgroundColor = "#000000";
    }
}

window.addEventListener('load', (event) => {
    ipcRender.invoke('getCurrentLightState').then((result: LightState) => {
        if (result) {
            setCurrentColorEl(result);
        }
    })
});

const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
}

const linearScale = (factor: number, minInput: number, maxInput: number, minOutput: number, maxOutput: number) => {
    factor = clamp(factor, minInput, maxInput);

    return minOutput + (maxOutput - minOutput) *
        (factor - minInput) / (maxInput - minInput);
}

const setLightState = async (newState: string) => {
    console.log(`Attempting to change the state of the lights to "${newState}"...`);

    ipcRender.invoke('setLightState', newState).then((result: LightState) => {
        if (result) {
            console.log("Light state changed successfully!");
            setCurrentColorEl(result);
        } else {
            console.log("Light did not change state!");
        }
    });
}

document.querySelector(".button__off").addEventListener("click", async () => { setLightState("off"); });
document.querySelector(".button__normal").addEventListener("click", async () => { setLightState("normal"); });
document.querySelector(".button__free").addEventListener("click", async () => { setLightState("free"); });
document.querySelector(".button__uncertain").addEventListener("click", async () => { setLightState("uncertain"); });
document.querySelector(".button__busy").addEventListener("click", async () => { setLightState("busy"); });
