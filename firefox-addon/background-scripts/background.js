class LightState {
    on;
    hue;
    sat;
    bri;
    ct;
    colormode;

    constructor({ isOn = true, hue = 65280, saturation = 254, brightness = 254, ct = -1 }) {
        this.on = isOn;
        if (!this.on) {
            // If the light is off, we don't need to bother setting any other member.
            return;
        }

        if (ct > -1) {
            this.ct = ct;
            this.colormode = "ct";
        } else {
            this.hue = hue;
            this.sat = saturation;
            this.colormode = "hs";
        }
        this.bri = brightness;
    }
}
const OFF_LIGHT_STATE = new LightState({ isOn: false });
const WARM_WHITE_LIGHT_STATE = new LightState({ ct: 170 });
const AVAILABLE_LIGHT_STATE = new LightState({ hue: 25500 });
const BUSY_LIGHT_STATE = new LightState({ hue: 2 });

const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
}

const linearScale = (factor, minInput, maxInput, minOutput, maxOutput) => {
    factor = clamp(factor, minInput, maxInput);

    return minOutput + (maxOutput - minOutput) *
        (factor - minInput) / (maxInput - minInput);
}

const updateExtensionButton = async () => {
    console.log(`Updating extension icon...`);

    switch (currentLightStateName) {
        case "off":
            await browser.browserAction.setIcon({
                path: {
                    32: "icons/icon-32-off.png",
                    48: "icons/icon-48-off.png"
                }
            });
            break;
        case "warm-white":
            await browser.browserAction.setIcon({
                path: {
                    32: "icons/icon-32-warm-white.png",
                    48: "icons/icon-48-warm-white.png"
                }
            });
            break;
        case "available":
            await browser.browserAction.setIcon({
                path: {
                    32: "icons/icon-32-green.png",
                    48: "icons/icon-48-green.png"
                }
            });
            break;
        case "busy":
            await browser.browserAction.setIcon({
                path: {
                    32: "icons/icon-32-red.png",
                    48: "icons/icon-48-red.png"
                }
            });
            break;
        case "unknown":
            await browser.browserAction.setIcon({
                path: {
                    512: "icons/icon-512.png"
                }
            });
            break;
        default:
            console.warn(`\`updateExtensionButton()\` called with unknown \`currentLightStateName\`:\n${currentLightStateName}`);
            break;
    }
}

let currentLightStateName = "unknown";
const setLightState = async (newLightStateName) => {
    if (!(HUE_IP && HUE_USERNAME)) {
        currentLightStateName = "unknown";
        updateExtensionButton();
        return;
    }

    const gotLightInfo = await getLightInfo();
    if (!gotLightInfo) {
        console.error(`setLightState(): Couldn't get light info!`);
        return false;
    }

    console.log(`Attempting to change the state of the lights to "${newLightStateName}"...`);

    let body;
    switch (newLightStateName) {
        case "off":
            body = JSON.stringify(OFF_LIGHT_STATE);
            break;
        case "warm-white":
            body = JSON.stringify(WARM_WHITE_LIGHT_STATE);
            break;
        case "available":
            body = JSON.stringify(AVAILABLE_LIGHT_STATE);
            break;
        case "busy":
            body = JSON.stringify(BUSY_LIGHT_STATE);
            break;
        default:
            console.warn(`\`setLightState()\` called with unknown argument:\n${newLightStateName}`);
            return undefined;
    }

    let failed = false;
    relevantLightIDs.forEach(async (lightID) => {
        const url = `http://${HUE_IP}/api/${HUE_USERNAME}/lights/${lightID}/state`;
        failed = failed || !(await fetch(url, {
            method: 'put',
            body
        }));
    });

    if (failed) {
        console.log("Light did not change state!");
    } else {
        currentLightStateName = newLightStateName;
        console.log(`setLightState(): Light state changed successfully to:\n${currentLightStateName}`);
        updateExtensionButton();
    }

    return !failed;
}

const onMessage = async ({ command, arg }) => {
    switch (command) {
        case "setLightState":
            await setLightState(arg);
            return { currentLightStateName };
        case "updateCurrentLightState":
            updateCurrentLightState();
            return { currentLightStateName };
        case "getCurrentLightStateName":
            return currentLightStateName;
        case "openOptionsPage":
            browser.runtime.openOptionsPage();
            break;
    }
}
browser.runtime.onMessage.addListener(onMessage);

browser.commands.onCommand.addListener((command) => {
    switch (command) {
        case "off":
        case "warm-white":
        case "available":
        case "busy":
            setLightState(command);
            break;
        default:
            console.log(`Command not recognized:\n${command}`);
            break;
    }
});

let relevantLightIDs = [];
const getLightInfo = async () => {
    if (!(HUE_IP && HUE_USERNAME && STATUS_LIGHT_NAMES)) {
        currentLightStateName = "unknown";
        updateExtensionButton();
        return;
    }

    const statusLightNamesArray = STATUS_LIGHT_NAMES.split(";");

    console.log(`Getting relevant Light IDs from Hue bridge at \`${HUE_IP}\`...`);
    relevantLightIDs = [];
    try {
        const response = await fetch(`http://${HUE_IP}/api/${HUE_USERNAME}/lights`);
        const lightsJSON = await response.json();
        const keys = Object.keys(lightsJSON);
        for (let i = 0; i < keys.length; i++) {
            if (statusLightNamesArray.includes(lightsJSON[keys[i]].name)) {
                relevantLightIDs.push(keys[i]);
            }
        }
        console.log(`Got relevant Light IDs:\n${JSON.stringify(relevantLightIDs)}`);
        return true;
    } catch (err) {
        console.error(err);
        currentLightStateName = "unknown";
        updateExtensionButton();
        return false;
    }
}

const updateCurrentLightState = async () => {
    if (!(HUE_IP && HUE_USERNAME)) {
        currentLightStateName = "unknown";
        updateExtensionButton();
        return undefined;
    }

    const gotLightInfo = await getLightInfo();
    if (!gotLightInfo) {
        console.error(`setLightState(): Couldn't get light info!`);
        currentLightStateName = "unknown";
        updateExtensionButton();
        return undefined;
    }

    try {
        const response = await fetch(`http://${HUE_IP}/api/${HUE_USERNAME}/lights/${relevantLightIDs[0]}`);
        const lightsJSON = await response.json();
        const currentState = lightsJSON.state;

        if (!currentState.on) {
            currentLightStateName = "off";
        } else if (currentState.colormode === "ct" && currentState.ct) {
            currentLightStateName = "warm-white";
        } else if (currentState.on && currentState.hue === 25500) {
            currentLightStateName = "available";
        } else if (currentState.on && currentState.hue === 2) {
            currentLightStateName = "busy";
        } else {
            currentLightStateName = "off";
        }
        console.log(`updateCurrentLightState(): Current light state name is:\n\`${currentLightStateName}\``);

        updateExtensionButton();

        return currentLightStateName;
    } catch (err) {
        console.error(err);
        currentLightStateName = "unknown";
        updateExtensionButton();
        return undefined;
    }
}

let HUE_IP, HUE_USERNAME, STATUS_LIGHT_NAMES;
const onStorageChanged = (changes, area) => {
    const changedItems = Object.keys(changes);

    let changed = false;
    for (let item of changedItems) {
        switch (item) {
            case "hueIP":
                HUE_IP = changes[item].newValue;
                changed = true;
                break;
            case "hueUsername":
                HUE_USERNAME = changes[item].newValue;
                changed = true;
                break;
            case "statusLightNames":
                STATUS_LIGHT_NAMES = changes[item].newValue;
                changed = true;
                break;
            default:
                break;
        }
    }

    if (changed) {
        updateCurrentLightState();
    }
}
browser.storage.onChanged.addListener(onStorageChanged);

const start = async () => {
    const { hueIP, hueUsername, statusLightNames } = await browser.storage.sync.get(['hueIP', 'hueUsername', 'statusLightNames']);
    HUE_IP = hueIP;
    HUE_USERNAME = hueUsername;
    STATUS_LIGHT_NAMES = statusLightNames;

    await getLightInfo();
    await updateCurrentLightState();
}
start();
