// I don't like that I have to duplicate this between
// `index.js` and `background.js`, but I can't figure out a way
// to share data between those two scripts.
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

const updateExtensionPopupUI = async (lightStateName) => {
    console.log(`updateExtensionPopupUI(): Updating extension popup UI...`);

    const { hueIP, hueUsername, statusLightNames } = await browser.storage.sync.get(['hueIP', 'hueUsername', 'statusLightNames']);
    if (!(hueIP && hueUsername && statusLightNames)) {
        const authorized = document.querySelector(".authorized");
        const unauthorized = document.querySelector(".unauthorized");

        authorized.classList.add("displayNone");
        unauthorized.classList.remove("displayNone");
        return;
    }

    const currentColor = document.querySelector(".currentColor");
    let computeHSL = false;

    if (!lightStateName) {
        lightStateName = await browser.runtime.sendMessage({
            command: "getCurrentLightStateName",
            arg: "please"
        });
    }

    console.log(`updateExtensionPopupUI(): Current light state name is:\n\`${lightStateName}\``);

    switch (lightStateName) {
        case "off":
            currentColor.style.backgroundColor = "#000000";
            break;
        case "warm-white":
            currentColor.style.backgroundColor = "#fff3c9";
            break;
        case "available":
            computeHSL = AVAILABLE_LIGHT_STATE;
            break;
        case "busy":
            computeHSL = BUSY_LIGHT_STATE;
            break;
        default:
            console.warn(`\`updateExtensionPopupUI()\` called with unknown \`lightStateName\`:\n${lightStateName}`);
            break;
    }

    if (computeHSL) {
        const temp = `hsl(${Math.round(linearScale(computeHSL.hue, 0, 65535, 0, 360))}deg, ${computeHSL.sat / 254 * 100}%, 50%)`;
        currentColor.style.backgroundColor = temp;
    }
}
document.addEventListener('DOMContentLoaded', () => { updateExtensionPopupUI(); });

const setLightStateButtonClicked = async (newLightStateName) => {
    console.log(`setLightStateButtonClicked(): Sending message to background script...`);
    const newStateName = await browser.runtime.sendMessage({
        command: "setLightState",
        arg: newLightStateName
    });

    if (newStateName) {
        updateExtensionPopupUI(newStateName);
    } else {
        console.error(`setLightStateButtonClicked(): Failed to set new light state!`);
    }
}
document.querySelector(".button__off").addEventListener("click", async () => { setLightStateButtonClicked("off"); });
document.querySelector(".button__normal").addEventListener("click", async () => { setLightStateButtonClicked("warm-white"); });
document.querySelector(".button__free").addEventListener("click", async () => { setLightStateButtonClicked("available"); });
document.querySelector(".button__busy").addEventListener("click", async () => { setLightStateButtonClicked("busy"); });

document.querySelectorAll(".openOptionsButton").forEach((e) => {
    e.addEventListener("click", () => {

        browser.runtime.sendMessage({
            command: "openOptionsPage",
            arg: "please"
        });
    });
});
