//--------------------------------------------------------
export const ENDPOINT_GLASSNODE_TX =
  "https://api.glassnode.com/v1/metrics/transactions/count";
export const ENDPOINT_GLASSNODE_FEE =
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
export const killWarp = "pkill -f warp-plus";
export const startWarpCmd = "warp-plus --gool -b";

export let WarpTimeout: number = 10000,
  WarpStartDelay: number = 5000,
  KillPortDelay: number = 3000;
