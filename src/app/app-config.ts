export const config = {
    retryCount: 0,
    retryCountL1: 0,
    isRunning: false
};

//--------------------------------------------------------
export function resetTry() {
  config.retryCountL1 = 0;
}
export function resetTryAll() {
  config.retryCountL1 = 0;
  config.retryCount = 0;
}
