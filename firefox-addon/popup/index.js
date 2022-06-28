const setLightStateButtonClicked = async (newLightStateName) => {
    console.log(`setLightStateButtonClicked(): Sending message to background script...`);
    const { currentLightStateName } = await browser.runtime.sendMessage({
        command: "setLightState",
        arg: newLightStateName
    });

    if (currentLightStateName) {
        updateExtensionPopupUI(currentLightStateName);
    } else {
        console.error(`setLightStateButtonClicked(): Failed to set new light state!`);
    }
}
const button__off = document.querySelector(".button__off");
button__off.addEventListener("click", async () => { setLightStateButtonClicked("off"); });
const button__normal = document.querySelector(".button__normal");
button__normal.addEventListener("click", async () => { setLightStateButtonClicked("warm-white"); });
const button__free = document.querySelector(".button__free");
button__free.addEventListener("click", async () => { setLightStateButtonClicked("available"); });
const button__busy = document.querySelector(".button__busy");
document.querySelector(".button__busy").addEventListener("click", async () => { setLightStateButtonClicked("busy"); });

const updateExtensionPopupUI = async (currentLightStateName) => {
    console.log(`updateExtensionPopupUI(): Updating extension popup UI...`);

    const { hueIP, hueUsername, statusLightNames } = await browser.storage.sync.get(['hueIP', 'hueUsername', 'statusLightNames']);
    if (!(hueIP && hueUsername && statusLightNames)) {
        const authorized = document.querySelector(".authorized");
        const unauthorized = document.querySelector(".unauthorized");

        authorized.classList.add("displayNone");
        unauthorized.classList.remove("displayNone");
        return;
    }

    button__off.classList.remove("selected");
    button__normal.classList.remove("selected");
    button__free.classList.remove("selected");
    button__busy.classList.remove("selected");
    switch (currentLightStateName) {
        case "off":
            button__off.classList.add("selected");
            break;
        case "warm-white":
            button__normal.classList.add("selected");
            break;
        case "available":
            button__free.classList.add("selected");
            break;
        case "busy":
            button__busy.classList.add("selected");
            break;
        default:
            break;
    }
}

const onPopupLoaded = async () => {
    const { currentLightStateName } = await browser.runtime.sendMessage({
        command: "updateCurrentLightState",
        arg: "please"
    });
    updateExtensionPopupUI(currentLightStateName);
}
document.addEventListener('DOMContentLoaded', () => { onPopupLoaded(); });

document.querySelectorAll(".openOptionsButton").forEach((e) => {
    e.addEventListener("click", () => {
        browser.runtime.sendMessage({
            command: "openOptionsPage",
            arg: "please"
        });
    });
});
