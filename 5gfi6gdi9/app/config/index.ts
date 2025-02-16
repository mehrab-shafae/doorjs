// export let retryCount = 0;
// export let retryCountL1 = 0;
export const config = {
    retryCount: 0,
    retryCountL1: 0,
    isRunning: false
};

//--------------------------------------------------------
export function resetTry() {
  config.retryCountL1 = 0;
  config.retryCount = 0;
}
