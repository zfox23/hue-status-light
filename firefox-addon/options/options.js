const restoreOptions = async () => {
    const { hueIP, hueUsername, statusLightNames } = await browser.storage.sync.get(['hueIP', 'hueUsername', 'statusLightNames']);
    
    document.querySelector("#hueIP").value = hueIP || "";
    document.querySelector("#hueUsername").value = hueUsername || "";
    document.querySelector("#statusLightNames").value = statusLightNames || "";
}
document.addEventListener('DOMContentLoaded', restoreOptions);

const authorizeForm = document.querySelector(".authorizeForm");
authorizeForm.addEventListener("submit", (e) => {
    const optionsToSet = {
        hueIP: document.querySelector("#hueIP").value,
        hueUsername: document.querySelector("#hueUsername").value,
        statusLightNames: document.querySelector("#statusLightNames").value,
    }

    console.log(`User set new options:\n${JSON.stringify(optionsToSet)}`);

    browser.storage.sync.set(optionsToSet);
    e.preventDefault();
});
