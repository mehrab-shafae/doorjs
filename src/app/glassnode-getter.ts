import axios, { AxiosError } from "axios";
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
  private httpsAgent: HttpsProxyAgent<string>;

  constructor(symbol: string, authHeadersGlassnode: string, cachePort: number) {
    this.symbol = symbol;
    this.authHeaders = authHeadersGlassnode;
    this.cachePort = cachePort;

    this.endpoints = EndPoints.map((endpoint: any) => ({
      ...endpoint,
      params: { ...endpoint.params, a: symbol },
    }));

    this.headers = { "Content-Type": "application/json" };

    const proxyUrl = `http://127.0.0.1:${this.cachePort}`;
    this.httpsAgent = new HttpsProxyAgent<string>(proxyUrl);
  }

  private async sendRequest(
    config: EndpointConfig,
    status: string,
    lastTimestamp?: number | null
  ): Promise<{ key: string; data: any[] } | null> {
    const params: ParamsType = { ...(config.params as ParamsType) };
    if (status === "last" && lastTimestamp != null) {
      params.s = lastTimestamp.toString();
    }

    const headers = { ...this.headers, cookie: this.authHeaders };

    console.log(
      `[request] GET ${config.endpoint} | Params: ${JSON.stringify(params)}`
    );

    try {
      const response = await axios.get(config.endpoint, {
        params,
        headers,
        timeout: 10000,
        httpsAgent: this.httpsAgent,
      });

      console.log(
        `[success] ${config.responseKey} | Status: ${response.status}`
      );
      return { key: config.responseKey, data: response.data };
    } catch (err) {
      const error = err as AxiosError;
      if (error.response?.status === 400) {
        console.warn(`[warning] ${config.responseKey} | Bad timestamp param`);
        return null;
      }
      console.warn(
        `[error] ${config.responseKey} | Request failed and skipped.`
      );
      return null;
    }
  }

  public async checkConnection(
    status: "all" | "last",
    lastTimestamp: number | null = null
  ): Promise<Record<string, any[]> | "bad timestamp parameter" | null> {
    const result: Record<string, any[]> = {};
    let hasBadTimestamp = false;

    for (const config of this.endpoints) {
      const res = await this.sendRequest(config, status, lastTimestamp);

      if (res === null) continue;
      if (
        Array.isArray(res.data) &&
        res.data.length > 0 &&
        res.data[0]?.status === 400
      ) {
        hasBadTimestamp = true;
        continue;
      }

      result[res.key] = res.data;
    }

    if (hasBadTimestamp) return "bad timestamp parameter";
    if (Object.keys(result).length === 0) return null;

    return result;
  }

  async getAll() {
    const responseData = await this.checkConnection("all");
    if (!responseData || typeof responseData === "string") return null;

    return this._processData(responseData);
  }

  async getLast(lastTimestamp: number) {
    const responseData = await this.checkConnection("last", lastTimestamp);
    if (!responseData || typeof responseData === "string") return [];

    return this._processData(responseData);
  }

  private _processData(responseData: Record<string, any[]>): any[] {
    // Maps data by timestamp
    const dataMap: Record<string, any> = {};

    for (const [key, dataset] of Object.entries(responseData)) {
      for (const item of dataset) {
        const timestamp = item.t.toString();
        if (!dataMap[timestamp]) {
          dataMap[timestamp] = {
            symbol: this.symbol,
            time: parseInt(timestamp),
          };
        }
        dataMap[timestamp][key] = item.v;
      }
    }

    // Convert to array
    return Object.values(dataMap);
  }
}
