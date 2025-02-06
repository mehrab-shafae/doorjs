import fs, { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { createLogger, format, transports } from "winston";
import axios from "axios";
import moment from "moment-timezone";

export default function (authHeadersGlassnode: string) {
  function convertTimestampToISO(timestampInt: number) {
    return moment
      .unix(timestampInt)
      .tz("UTC")
      .toISOString()
      .replace("+00:00", "Z");
  }

  // Constants
  const LEVEL_LOGGING = "info";
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

  // Configure logger
  const logsDir = join(process.cwd(), "logs");
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }

  const logger = createLogger({
    level: LEVEL_LOGGING,
    format: format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json()
    ),
    transports: [
      new transports.File({
        filename: join(logsDir, "Sol_Offline.log"),
        format: format.combine(
          format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          format.printf(
            (info) => `${info.timestamp} - ${info.level} - ${info.message}`
          )
        ),
      }),
      new transports.Console({
        format: format.combine(
          format.colorize(),
          format.printf((info) => `${info.level}: ${info.message}`)
        ),
        level: "error",
      }),
    ],
  });

  class GetDataGlassnode {
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

      const PARAMS_GLASSNODE_TX = { a: symbol, i: "24h", referrer: "charts" };
      const PARAMS_GLASSNODE_FEE = { a: symbol, i: "24h", referrer: "charts" };

      this.paramsTx = { ...PARAMS_GLASSNODE_TX };
      this.paramsFee = { ...PARAMS_GLASSNODE_FEE };
      this.headers = { ...HEADER_GLASSNODE_REQUESTS };
    }

    async _checkConnection(
      status: string,
      lastTimestamp: number | null = null
    ) {
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
          const txParams = { ...this.paramsTx, s: lastTimestamp?.toString() };
          const feeParams = { ...this.paramsFee, s: lastTimestamp?.toString() };

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
          logger.info("Glassnode connection successful");
          return { tx: responseTx.data, fee: responseFee.data };
        }

        if ([responseTx.status, responseFee.status].includes(400)) {
          logger.warning("Bad timestamp parameter");
          return "bad timestamp parameter";
        }

        logger.error("Connection to Glassnode failed");
        return null;
      } catch (error: any) {
        logger.error(`Connection error: ${error.message}`);
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
      const connectionResult = await this._checkConnection(
        "last",
        lastTimestamp
      );
      if (!connectionResult) return null;
      if (typeof connectionResult === "string") return [];

      return this._processData(connectionResult);
    }

    _processData({ tx, fee }: { tx: any[]; fee: any[] }) {
      const processedData: any[] = [];
      const txData: { [key: string]: { transactions: number; fees?: number } } =
        tx.reduce((acc, item) => {
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
          symbol: this.symbol,
          time: parseInt(timestamp), // this._timestampToISO
          number_of_transactions: values.transactions,
          total_fees_unit: values.fees || null,
        });
      }

      return processedData;
    }
  }

  (async () => {
    // let solData, dogeData; // objects finally
    // const nodes = [{node: "SOL", saveTo: solData}, {node: "DOGE", saveTo: dogeData}];
    // nodes.forEach(node => {
    //   console.log("node: ", node)
    //   node.forEach(dot => {
    //     console.log("dot: ", dot)
    //   });
    //   // const getData = new GetDataGlassnode(node, authHeadersGlassnode);
    //   // console.log(await getData.getAll());
    //   // const data = await getData.getAll();
    // });

    let solData: string, dogeData: string; // objects finally

    async function processNodes(nodes: any) {
      const promises = nodes.map(
        async ({ node, saveTo }: { node: string; saveTo: string }) => {
          console.log(node);
          const getData = new GetDataGlassnode(node, authHeadersGlassnode);
          const data = await getData.getAll();

          eval(`${saveTo} = JSON.stringify(data)`);
        }
      );

      await Promise.all(promises);
    }

    // nodes.forEach(async ({ node, saveTo }) => {
    //   console.log(node);
    //   const getData = new GetDataGlassnode("SOL", authHeadersGlassnode);
    //   // console.log(await getData.getAll());
    //   const data = await getData.getAll();

    //   eval(`${saveTo} = JSON.stringify(data)`);

    // });

    const nodes = [
      { node: "SOL", saveTo: "solData" },
      { node: "DOGE", saveTo: "dogeData" },
    ];

    processNodes(nodes)
      .then(() => {
        console.log("All nodes processed");
        // @ts-ignore
        fs.writeFile("data-sol.json", solData, (err) => {
          if (err) {
            console.error(err);
          } else {
            console.log("saved");
          }
        });

        // @ts-ignore
        fs.writeFile("data-doge.json", dogeData, (err) => {
          if (err) {
            console.error(err);
          } else {
            console.log("saved");
          }
        });
      })
      .catch((error) => {
        console.error("Error processing nodes:", error);
      });

    //   fs.readFile('data.json', 'utf8', (err, fileData) => {
    //     if (err) {
    //         console.error(err);
    //     } else {
    //         // console.log('Read data:', fileData);
    //         axios.post('http://172.18.8.96:8585/feed/', fileData, {
    //           headers: {
    //             'Accept': 'application/json',
    //             'Content-Type': 'application/json'
    //           }
    //         })
    //         .then(response => {
    //           console.log('Response:', response.data);
    //         })
    //         .catch(error => {
    //           console.error('Error:', error);
    //         });
    //     }
    // });

    // axios.post('http://172.18.8.96:8585/feed/', JSON.stringify(data), {
    //   headers: {
    //     'Accept': 'application/json',
    //     'Content-Type': 'application/json'
    //   }
    // })
    // .then(response => {
    //   console.log('Response:', response.data);
    // })
    // .catch(error => {
    //   console.error('Error:', error);
    // });

    //   console.log(await getData.getLast(1738627200));
  })();
}
