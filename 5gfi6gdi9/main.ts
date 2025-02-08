// on the core ;)
// by S-MRB-S

import { Core } from "@marboris/core";
import puppeteer from "puppeteer";

import cron from "node-cron";
import moment from "moment-timezone";

import fs from "fs";
import axios from "axios";

import { exec, ChildProcess } from "child_process";

let isRunning = false;

const MAX_RETRIES = 5;
let retryCount = 0;

let retryCountL1 = 0;
const MAX_RETRIES_L1 = 6;

/**
 * 2 layers
 * and 3 part on the one layer
 *
 * 3 try and restart the ip
 */
new (class extends Core {
  Main() {
    const app = async () => {
      let browser;
      try {
        browser = await puppeteer.launch({
          headless: true,
          executablePath: this.config.EnvConfig.chrome,
          ...(this.config.Args.test
            ? {}
            : { args: ["--proxy-server=" + this.config.EnvConfig.proxy] }),
        });

        console.log("Puppeteer is starting...");
        const page = await browser.newPage();

        await page.deleteCookie(...(await page.cookies()));
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        );
        await page.goto("https://studio.glassnode.com/home", {
          waitUntil: "networkidle0",
          timeout: this.config.EnvConfig.timeout,
        });
        await page.reload(); // we need clear cache like ctrl+F5

        console.log("We load the Glassnode site.. 8s waiting.");
        await new Promise((resolve) => setTimeout(resolve, 8000));

        try {
          await page.click('button[data-cy="login-btn"]');
        } catch (error) {
          console.log(`Error in L1: ${(error as Error).message}`);
          retryCountL1++;
          if (retryCountL1 < MAX_RETRIES_L1) {
            console.log(`Retrying... (${retryCountL1}/${MAX_RETRIES_L1})`);
            app(); // دوباره تلاش می‌کنیم
            return;
          } else {
            console.log("[L1] Max retries reached. Restarting...");
            throw new Error("L1 dumped");
          }
        }

        console.log("Login button founded ! we sleep 8s more..");
        await new Promise((resolve) => setTimeout(resolve, 8000));

        try {
          await page.type('input[name="email"]', this.config.EnvConfig.email);
          await page.type(
            'input[name="current-password"]',
            this.config.EnvConfig.password
          );

          console.log("We try login...");
          await page.click("button.MuiButton-containedPrimary");
        } catch (error) {
          console.log(`Error in L1: ${(error as Error).message}`);
          retryCountL1++;
          if (retryCountL1 < MAX_RETRIES_L1) {
            console.log(`Retrying... (${retryCountL1}/${MAX_RETRIES_L1})`);
            app(); // دوباره تلاش می‌کنیم
            return;
          } else {
            console.log("[L1] Max retries reached. Restarting...");
            throw new Error("L1 dumped");
          }
        }

        console.log("We login :D ! We 20s waiting for cookies.");
        await new Promise((resolve) => setTimeout(resolve, 20000));

        const cookies = await page.cookies();

        try {
          console.log("try to find main cookie!");

          const ajsCookie = cookies.find(
            (cookie) => cookie.name === "ajs_anonymous_id"
          );

          if (!ajsCookie || !ajsCookie.value) {
            throw new Error(
              "cookie ajs_anonymous_id not found or is null :( \n we try again."
            );
          }
        } catch (error) {
          console.log(`Error in L1: ${(error as Error).message}`);
          retryCountL1++;
          if (retryCountL1 < MAX_RETRIES_L1) {
            console.log(`Retrying... (${retryCountL1}/${MAX_RETRIES_L1})`);
            app(); // دوباره تلاش می‌کنیم
            return;
          } else {
            console.log("[L1] Max retries reached. Restarting...");
            throw new Error("L1 dumped");
          }
        }

        const cookieString = cookies
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join(";");
        console.log(cookieString);

        function convertTimestampToISO(timestampInt: number) {
          return moment
            .unix(timestampInt)
            .tz("UTC")
            .toISOString()
            .replace("+00:00", "Z");
        }

        // Constants
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
                symbol: this.symbol,
                time: parseInt(timestamp), // this._timestampToISO
                number_of_transactions: values.transactions,
                total_fees_unit: values.fees || null,
              });
            }

            return processedData;
          }
        }

        let solData: string, dogeData: string; // objects finally

        const sendDataToApi = async (data: any) => {
          try {
            const res = await axios.post(
              this.config.EnvConfig.databasep + "/feed/",
              JSON.stringify(data),
              {
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
              }
            );
            console.log("Response:", res.status);
          } catch (error) {
            console.error("Axios error!");
            throw error;
          }
        };

        const processNodes = async (
          nodes: Array<{ node: string; saveTo: string }>
        ) => {
          const promises = nodes.map(async ({ node, saveTo }) => {
            try {
              console.log(node);
              const getData = new GetDataGlassnode(node, cookieString);
              const data = await getData.getAll();
              // console.log(await getData.getLast(1738627200));

              if (!data) {
                throw new Error("data is null!");
              }

              eval(`${saveTo} = JSON.stringify(data)`);

              console.log("send data to api");
              if (!this.config.Args.fast) await sendDataToApi(data);
              isRunning = false;
            } catch (error) {
              console.error("Error occurred:", error);
            }
          });

          await Promise.all(promises);
        };

        const nodes = [
          { node: "SOL", saveTo: "solData" },
          { node: "DOGE", saveTo: "dogeData" },
        ];

        processNodes(nodes)
          .then(() => {
            console.log("All nodes processed");
            fs.writeFile("data-sol.json", solData!, (err) => {
              if (err) {
                console.error(err);
              } else {
                console.log("saved");
              }
            });

            fs.writeFile("data-doge.json", dogeData!, (err) => {
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
      } finally {
        try {
          await browser!.close();
        } catch (_) {}
      }
    };

    const run = () => {
      const pur = () => {
        function killWarpPlus(callback: () => void): void {
          exec("pkill -f warp-plus", (error) => {
            if (error) {
              console.log(`[Error] killing warp-plus: ${error.message}`);
            }
            callback();
          });
        }

        function startWarpPlus(
          port: number,
          callback: (childProcess: ChildProcess) => void
        ): void {
          const command = `./warp-plus --gool -b 127.0.0.1:${port} -v`;
          const childProcess = exec(command);

          childProcess.stdout?.on("data", (data: string) => {
            console.log(data);
            if (data.includes("connection test successful")) {
              console.log(`warp-plus is running on port ${port}`);
              callback(childProcess);
            }
          });

          childProcess.stderr?.on("data", (data: string) => {
            console.log(`[error] stderr: ${data}`);
          });

          childProcess.on("exit", (code: number) => {
            console.log(`warp-plus exited with code ${code}`);
          });
        }

        function stopWarpPlus(childProcess: ChildProcess | null): void {
          if (childProcess) {
            childProcess.kill();
            console.log("warp-plus stopped");
          }
        }

        killWarpPlus(() => {
          startWarpPlus(1235, (childProcess) => {
            setTimeout(() => {
              stopWarpPlus(childProcess);
              startWarpPlus(1234, (childProcess) => {
                try {
                  app(); // اجرای تابع اصلی
                } catch (error) {
                  console.log(`Error in main: ${(error as Error).message}`);
                  retryCount++;
                  if (retryCount < MAX_RETRIES) {
                    console.log(`Retrying... (${retryCount}/${MAX_RETRIES})`);
                    pur(); // دوباره تلاش می‌کنیم
                  } else {
                    console.log("[error] Max retries reached. Exiting...");
                    process.exit(1); // خروج با خطا
                  }
                }
              });
            }, 3000); // زمان انتظار برای اطمینان از اینکه warp-plus آماده است
          });
        });
      };
      let timeSc = this.config.Args.fast ? "*/5 * * * *" : "30 1 * * *"; // 1:30 PM
      cron.schedule(
        timeSc,
        () => {
          if (isRunning) {
            console.log(
              "Previous instance is still running. Skipping this execution."
            );
            return; // اگر در حال اجرا است، از اجرای دوباره جلوگیری می‌کنیم
          }

          isRunning = true;

          const timeInUTC = moment().utc().format("YYYY-MM-DD HH:mm:ss");
          console.log(
            `[warn] Hi! Current time in UTC: ${timeInUTC}, ~{19}\`We start the Core.\``
          );
          pur();
        },
        {
          scheduled: true,
          timezone: "UTC",
        }
      );
      console.log("[info] ~{5}`Cron job scheduled. It will run every night.`");
    };

    (() => {
      if (this.config.Args.test) {
        void app();
      } else {
        run();
      }
    })();
  }
})();
