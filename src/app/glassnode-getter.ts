import axios, { AxiosError, AxiosResponse } from "axios";
import { convertTimestampToISO } from "../misc/index.js";
import { EndPoints } from "../config.js";
import { HttpsProxyAgent } from "https-proxy-agent";

interface EndpointConfig {
  name: string;
  endpoint: string;
  params: object;
  responseKey: string;
}

interface ParamsType {
  a: string;
  i: string;
  referrer: string;
  s?: string;
}

export class GetDataGlassnode {
  symbol: string;
  authHeaders: string;
  endpoints: EndpointConfig[];
  headers: object;
  cachePort: number;

  constructor(symbol: string, authHeadersGlassnode: string, cachePort: number) {
    this.cachePort = cachePort;
    this.symbol = symbol;
    this.authHeaders = authHeadersGlassnode;
    this.endpoints = EndPoints.map((endpoint: any) => ({
      ...endpoint,
      params: {
        ...endpoint.params,
        a: symbol,
      },
    }));
    this.headers = {
      ...{
        "Content-Type": "application/json",
      },
    };
  }

  private async sendRequest(
    config: EndpointConfig,
    status: string,
    lastTimestamp?: number | null
  ): Promise<AxiosResponse<any> | undefined> {
    const headers = { ...this.headers, cookie: this.authHeaders };

    const params: ParamsType = { ...config.params } as ParamsType;
    if (status === "last" && lastTimestamp != null) {
      params.s = lastTimestamp.toString();
    }

    console.debug('[request] URL:', config.endpoint);
    console.debug('[request] Params:', params);
    // console.debug('[request] Headers:', headers);

    const proxyUrl = `http://127.0.0.1:${this.cachePort}`;
    const httpsAgent = new HttpsProxyAgent(proxyUrl);

    try {
      const response = await axios.get(config.endpoint, {
        params,
        headers,
        timeout: 10000,
        httpsAgent,
      });

      console.debug("[response] Status:", response.status);
      console.debug("[response] Data:", response.data);

      return response;
    } catch (err) {
      const error = err as AxiosError;
      if (error.response) {
        console.error("[response error] Status:", error.response.status);
        console.error("[response error] Data:", error.response.data);
      } else {
        console.error("[network error]", error.message);
      }
      // throw error;
    }
  }

  public async checkConnection(
    status: string,
    lastTimestamp: number | null = null
  ): Promise<Record<string, any> | "bad timestamp parameter" | null> {
    this.headers = { ...this.headers, cookie: this.authHeaders };

    const promises = this.endpoints.map((cfg) =>
      this.sendRequest(cfg, status, lastTimestamp)
    );

    try {
      const results = await Promise.allSettled(promises);

      const successful = results.filter(
        (r) => r.status === "fulfilled"
      ) as PromiseFulfilledResult<AxiosResponse<any>>[];
      const failed = results.filter(
        (r) => r.status === "rejected"
      ) as PromiseRejectedResult[];

      if (successful.length === this.endpoints.length) {
        console.info("[info] Glassnode connection successful");

        return this.endpoints.reduce((acc, cfg, idx) => {
          acc[cfg.responseKey] = successful[idx].value.data;
          return acc;
        }, {} as Record<string, any>);
      }

      const hasBadTimestamp = successful.some(
        (res) => res.value.status === 400
      );
      if (hasBadTimestamp) {
        console.warn("[warning] Bad timestamp parameter");
        return "bad timestamp parameter";
      }

      console.error(
        "[error] Some requests failed:",
        failed.map((f) => (f.reason as AxiosError).message)
      );
      return null;
    } catch (fatal) {
      console.error("[error] Unexpected failure:", (fatal as Error).message);
      return null;
    }
  }

  _timestampToISO(timestamp: number) {
    return convertTimestampToISO(timestamp);
  }

  async getAll() {
    const connectionResult = await this.checkConnection("all");
    if (!connectionResult || typeof connectionResult === "string") {
      return null;
    }

    return this._processData(connectionResult);
  }

  async getLast(lastTimestamp: number) {
    const connectionResult = await this.checkConnection("last", lastTimestamp);
    if (!connectionResult) return null;
    if (typeof connectionResult === "string") return [];

    return this._processData(connectionResult);
  }

  _processData(responseData: Record<string, any[]>) {
    const processedData: any[] = [];
    const dataMap: any = {};

    Object.entries(responseData).forEach(([responseKey, data]) => {
      data.forEach((item) => {
        const timestamp = item.t.toString();
        if (!dataMap[timestamp]) {
          dataMap[timestamp] = {
            symbol: this.symbol,
            time: parseInt(timestamp),
          };
        }
        dataMap[timestamp][responseKey] = item.v;
      });
    });

    for (const timestamp of Object.keys(dataMap)) {
      processedData.push(dataMap[timestamp]);
    }

    return processedData;
  }
}
