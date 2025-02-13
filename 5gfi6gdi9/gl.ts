import axios from "axios";
import moment from "moment-timezone";

function convertTimestampToISO(timestampInt: number) {
  return moment
    .unix(timestampInt)
    .tz("UTC")
    .toISOString()
    .replace("+00:00", "Z");
}

const ENDPOINT_GLASSNODE_TX =
  "https://api.glassnode.com/v1/metrics/transactions/count";
const ENDPOINT_GLASSNODE_FEE =
  "https://api.glassnode.com/v1/metrics/fees/volume_sum";
const HEADER_GLASSNODE_REQUESTS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0",
  "sec-ch-ua":
    '"Not A(Brand";v="8", "Chromium";v="132", "Microsoft Edge";v="132"',
};

export class GetDataGlassnode {
  symbol: string;
  authHeaders: string;
  endpointTx: string;
  endpointFee: string;
  paramsTx: object;
  paramsFee: object;
  headers: object | any;

  constructor(symbol: string, authHeadersGlassnode: string) {
    this.symbol = symbol;
    this.authHeaders = authHeadersGlassnode;
    this.endpointTx = ENDPOINT_GLASSNODE_TX;
    this.endpointFee = ENDPOINT_GLASSNODE_FEE;

    const PARAMS_GLASSNODE_TX = {
      a: symbol,
      i: "24h",
      referrer: "charts",
    };
    const PARAMS_GLASSNODE_FEE = {
      a: symbol,
      i: "24h",
      referrer: "charts",
    };

    this.paramsTx = { ...PARAMS_GLASSNODE_TX };
    this.paramsFee = { ...PARAMS_GLASSNODE_FEE };
    this.headers = { ...HEADER_GLASSNODE_REQUESTS };
  }

  async _checkConnection(status: string, lastTimestamp: number | null = null) {
    this.headers.cookie = this.authHeaders;

    try {
      let responseTx, responseFee;

      if (status === "all") {
        [responseTx, responseFee] = await Promise.all([
          axios.get(this.endpointTx, {
            params: this.paramsTx,
            headers: this.headers,
            timeout: 10000,
          }),
          axios.get(this.endpointFee, {
            params: this.paramsFee,
            headers: this.headers,
            timeout: 10000,
          }),
        ]);
      } else if (status === "last") {
        const txParams = {
          ...this.paramsTx,
          s: lastTimestamp?.toString(),
        };
        const feeParams = {
          ...this.paramsFee,
          s: lastTimestamp?.toString(),
        };

        [responseTx, responseFee] = await Promise.all([
          axios.get(this.endpointTx, {
            params: txParams,
            headers: this.headers,
            timeout: 10000,
          }),
          axios.get(this.endpointFee, {
            params: feeParams,
            headers: this.headers,
            timeout: 10000,
          }),
        ]);
      } else {
        return null;
      }

      if (responseTx.status === 200 && responseFee.status === 200) {
        console.log("[info] Glassnode connection successful");
        return { tx: responseTx.data, fee: responseFee.data };
      }

      if ([responseTx.status, responseFee.status].includes(400)) {
        console.log("[warning] Bad timestamp parameter");
        return "bad timestamp parameter";
      }

      console.log("[error] Connection to Glassnode failed");
      return null;
    } catch (error: any) {
      console.log(`[error] Connection error: ${error.message}`);
      return null;
    }
  }

  _timestampToISO(timestamp: number) {
    return convertTimestampToISO(timestamp);
  }

  async getAll() {
    const connectionResult = await this._checkConnection("all");
    if (!connectionResult || typeof connectionResult === "string") {
      return null;
    }

    return this._processData(connectionResult);
  }

  async getLast(lastTimestamp: number) {
    const connectionResult = await this._checkConnection("last", lastTimestamp);
    if (!connectionResult) return null;
    if (typeof connectionResult === "string") return [];

    return this._processData(connectionResult);
  }

  _processData({ tx, fee }: { tx: any[]; fee: any[] }) {
    const processedData: any[] = [];
    const txData: {
      [key: string]: { transactions: number; fees?: number };
    } = tx.reduce((acc, item) => {
      acc[item.t] = { transactions: item.v };
      return acc;
    }, {} as { [key: string]: { transactions: number; fees?: number } });

    fee.forEach((item) => {
      if (txData[item.t]) {
        txData[item.t].fees = item.v;
      }
    });

    for (const [timestamp, values] of Object.entries(txData)) {
      processedData.push({
        symbol: this.symbol + "1",
        time: parseInt(timestamp), // this._timestampToISO
        number_of_transactions: values.transactions,
        total_fees_unit: values.fees || null,
      });
    }

    return processedData;
  }
}
