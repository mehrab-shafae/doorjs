//--------------------------------------------------------
export let ENDPOINT_GLASSNODE_TX =
  "https://api.glassnode.com/v1/metrics/transactions/count";
export let ENDPOINT_GLASSNODE_FEE =
  "https://api.glassnode.com/v1/metrics/fees/volume_sum";

//--------------------------------------------------------
export let DefaultAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0";
export const HEADER_GLASSNODE_REQUESTS = {
  "user-agent": DefaultAgent,
  "sec-ch-ua":
    '"Not A(Brand";v="8", "Chromium";v="132", "Microsoft Edge";v="132"',
};

//--------------------------------------------------------
export let killWarp = "pkill -f warp-plus";
export let startWarpCmd = "bin/warp-plus --gool -b";

//--------------------------------------------------------
export let WarpTimeout: number = 10000,
  WarpStartDelay: number = 5000,
  KillPortDelay: number = 3000;
//--------------------------------------------------------
export let UnixTimeISOtz = "UTC";
export let UnixTimeISOr = "Z";
//--------------------------------------------------------
export let MAX_RETRIES = 5;
export let MAX_RETRIES_L1 = 6;

export let HomePage = "https://studio.glassnode.com/home";
export let MainCookieName = "ajs_anonymous_id";

export let MAX_RANDOM_PORT=0;
//--------------------------------------------------------
export function initConfig(GEnv: any) {
  ENDPOINT_GLASSNODE_TX = GEnv.ENDPOINT_GLASSNODE_TX;
  ENDPOINT_GLASSNODE_FEE = GEnv.ENDPOINT_GLASSNODE_FEE;

  //--------------------------------------------------------
  DefaultAgent = GEnv.DefaultAgent;
  //--------------------------------------------------------
  killWarp = GEnv.killWarp;
  startWarpCmd = GEnv.startWarpCmd;

  //--------------------------------------------------------
  (WarpTimeout = GEnv.WarpTimeout),
    (WarpStartDelay = GEnv.WarpStartDelay),
    (KillPortDelay = GEnv.KillPortDelay);
  //--------------------------------------------------------
  UnixTimeISOtz = GEnv.UnixTimeISOtz;
  UnixTimeISOr = GEnv.UnixTimeISOr;
  //--------------------------------------------------------
  MAX_RETRIES = GEnv.MAX_RETRIES;
  MAX_RETRIES_L1 = GEnv.MAX_RETRIES_L1;

  HomePage = GEnv.HomePage;
  MainCookieName = GEnv.MainCookieName;

  MAX_RANDOM_PORT = GEnv.MAX_RANDOM_PORT;
}
