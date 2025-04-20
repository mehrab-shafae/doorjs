import axios from "axios";
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

  async _checkConnection(status: string, lastTimestamp: number | null = null) {
    this.headers = { ...this.headers, cookie: this.authHeaders };

    try {
      const requests = this.endpoints.map((config) => {
        const params: ParamsType = { ...config.params } as ParamsType;

        if (status === "last" && lastTimestamp) {
          params.s = lastTimestamp.toString();
        }

        // console.log('endpoint:', config.endpoint);
        // console.log('params:', params);
        // console.log('headers:', this.headers);
        const proxyUrl = "http://127.0.0.1:" + this.cachePort;
        const httpsAgent = new HttpsProxyAgent(proxyUrl);

        return axios.get(config.endpoint, {
          params,
          headers: this.headers,
          timeout: 10000,
          httpsAgent,
        });
      });

      const responses = await Promise.all(requests);

      if (responses.every((r) => r.status === 200)) {
        console.log("[info] Glassnode connection successful");
        return this.endpoints.reduce((acc, config, index) => {
          acc[config.responseKey] = responses[index].data;
          return acc;
        }, {} as Record<string, any>);
      }

      if (responses.some((r) => r.status === 400)) {
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
