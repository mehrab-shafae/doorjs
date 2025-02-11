// @ts-ignore

export default class CloudflareBypasser {
    // @ts-ignore
    constructor(page, maxRetries = -1, log = true) {
        this.page = page;
        this.maxRetries = maxRetries;
        this.log = log;
    }

    // @ts-ignore
    async searchRecursivelyShadowRootWithIframe(ele) {
        // @ts-ignore
        const shadowRoot = await ele.evaluateHandle(el => el.shadowRoot);
        if (shadowRoot) {
            const iframe = await shadowRoot.$('iframe');
            if (iframe) {
                return iframe;
            }
        } else {
            const children = await ele.$(' * '); // Use $ to get all children
            for (const child of children) {
                // @ts-ignore
                const result = await this.searchRecursivelyShadowRootWithIframe(child);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    }

    // @ts-ignore
    async searchRecursivelyShadowRootWithCfInput(ele) {
        // @ts-ignore
        const shadowRoot = await ele.evaluateHandle(el => el.shadowRoot);
        if (shadowRoot) {
            const input = await shadowRoot.$('input');
            if (input) {
                return input;
            }
        } else {
            const children = await ele.$(' * '); // Use $ to get all children
            for (const child of children) {
                // @ts-ignore
                const result = await this.searchRecursivelyShadowRootWithCfInput(child);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    }

    async locateCfButton() {
        const inputs = await this.page.$('input'); // Use $ to get all inputs
        for (const input of inputs) {
            // @ts-ignore
            const name = await input.evaluate(el => el.getAttribute('name'));
            // @ts-ignore
            const type = await input.evaluate(el => el.getAttribute('type'));
            if (name && type && name.includes('turnstile') && type === 'hidden') {
                // @ts-ignore
                const button = await input.evaluateHandle(el => el.parentElement?.shadowRoot?.querySelector('body')?.shadowRoot?.querySelector('input'));
                return button;
            }
        }

        this.logMessage("Basic search failed. Searching for button recursively.");
        const body = await this.page.$('body');
        const iframe = await this.searchRecursivelyShadowRootWithIframe(body);
        if (iframe) {
            return await this.searchRecursivelyShadowRootWithCfInput(await iframe.$('body'));
        } else {
            this.logMessage("Iframe not found. Button search failed.");
        }
        return null;
    }

    // @ts-ignore
    logMessage(message) {
        if (this.log) {
            console.log(message);
        }
    }

    async clickVerificationButton() {
        try {
            const button = await this.locateCfButton();
            if (button) {
                this.logMessage("Verification button found. Attempting to click.");
                await button.click();
            } else {
                this.logMessage("Verification button not found.");
            }
        } catch (e) {
            this.logMessage(`Error clicking verification button: ${e}`);
        }
    }

    async isBypassed() {
        try {
            const title = await this.page.title();
            return !title.toLowerCase().includes("just a moment");
        } catch (e) {
            this.logMessage(`Error checking page title: ${e}`);
            return false;
        }
    }

    async bypass() {
        let tryCount = 0;

        while (!(await this.isBypassed())) {
            if (this.maxRetries > 0 && tryCount >= this.maxRetries) {
                this.logMessage("Exceeded maximum retries. Bypass failed.");
                break;
            }

            this.logMessage(`Attempt ${tryCount + 1}: Verification page detected. Trying to bypass...`);
            await this.clickVerificationButton();

            tryCount++;
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before the next attempt
        }

        if (await this.isBypassed()) {
            this.logMessage("Bypass successful.");
        } else {
            this.logMessage("Bypass failed.");
        }
    }
}
