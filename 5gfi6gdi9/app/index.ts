import { MainCC } from "5gfi6gdi9/main.js";

export class App extends MainCC {
    constructor(core: MainCC) {
        super();
        Object.assign(this, core);
    }

    // public accessCoreValue(): string {
    //     return this.getCoreValue(); // Access Core's method via this
    // }
}
