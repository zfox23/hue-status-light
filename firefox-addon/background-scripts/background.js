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
        default:
            console.warn(`\`updateExtensionButton()\` called with unknown \`currentLightStateName\`:\n${currentLightStateName}`);
            break;
    }
}

let currentLightStateName = "off";
const setLightState = async (newLightStateName) => {
    const { hueIP, hueUsername } = await browser.storage.sync.get(['hueIP', 'hueUsername']);
    if (!(hueIP && hueUsername)) {
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
        const url = `http://${hueIP}/api/${hueUsername}/lights/${lightID}/state`;
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
            return currentLightStateName;
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
    const { hueIP, hueUsername, statusLightNames } = await browser.storage.sync.get(['hueIP', 'hueUsername', 'statusLightNames']);
    if (!(hueIP && hueUsername && statusLightNames)) {
        return;
    }

    const statusLightNamesArray = statusLightNames.split(";");

    console.log(`Getting relevant Light IDs from Hue bridge at \`${hueIP}\`...`);
    relevantLightIDs = [];
    try {
        const response = await fetch(`http://${hueIP}/api/${hueUsername}/lights`);
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
        return false;
    }
}

const getCurrentLightState = async () => {
    const { hueIP, hueUsername } = await browser.storage.sync.get(['hueIP', 'hueUsername']);
    if (!(hueIP && hueUsername)) {
        return;
    }

    const gotLightInfo = await getLightInfo();
    if (!gotLightInfo) {
        console.error(`setLightState(): Couldn't get light info!`);
        return undefined;
    }

    try {
        const response = await fetch(`http://${hueIP}/api/${hueUsername}/lights/${relevantLightIDs[0]}`);
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
        console.log(`getCurrentLightState(): Current light state name is:\n\`${currentLightStateName}\``);

        updateExtensionButton();
    } catch (err) {
        console.error(err);
    }

    return undefined;
}

const start = async () => {
    await getLightInfo();
    await getCurrentLightState();
}
start();
