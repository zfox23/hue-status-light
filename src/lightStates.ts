export class LightState {
    on: boolean;
    hue: number;
    sat: number;
    bri: number;
    ct: number;
    colormode: string;

    constructor({isOn = true, hue = 65280, saturation = 254, brightness = 254, ct = -1}) {
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

export const BUSY_LIGHT_STATE = new LightState({hue: 2});
export const UNCERTAIN_LIGHT_STATE = new LightState({hue: 12750});
export const FREE_LIGHT_STATE = new LightState({hue: 25500});
export const NORMAL_LIGHT_STATE = new LightState({ct: 170});
export const OFF_LIGHT_STATE = new LightState({isOn: false});
