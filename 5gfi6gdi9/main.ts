// on the core ;)
// by S-MRB-S

process.stdin.resume(); // the program will not close instantly

import { Core } from "@marboris/core";
import puppeteer from "puppeteer";

import cron from "node-cron";
import moment from "moment-timezone";

import fs from "fs";
import axios from "axios";

import { exec, ChildProcess } from "child_process";

import * as net from "net";

let isRunning = false;
let isWarpRunning = false;

const MAX_RETRIES = 5;
let retryCount = 0;

let retryCountL1 = 0;
const MAX_RETRIES_L1 = 6;

function resetTry(){
  retryCountL1 = 0;
  retryCount = 0;
}

new (class extends Core {
  Main() {
    let cachePort: number | undefined;
    const app = async (warpPort?: number) => {
      if (!cachePort) cachePort = warpPort || undefined;
      let browser;
      try {
        browser = await puppeteer.launch({
          headless: true,
          executablePath: this.config.EnvConfig.chrome,
          ...(this.config.Args.test
            ? {}
            : { args: ["--proxy-server=http://127.0.0.1:" + cachePort] }),
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
            app(); // try again ..
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
            app(); // try again ..
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
            app(); // try again ..
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

        let solData: string, dogeData: string;

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
                timeout: 5000,
              }
            );
            console.log("Response:", res.status);
          } catch (error) {
            console.log("[Error] sendDataToApi => Axios error!");
            return;
            // throw error;
          }
        };

        // interface Eval {
        //   [key: string]: any;
        // }
        const processNodes = async (
          nodes: Array<{ node: string; saveTo: string }>
        ) => {
          let dogeTimestamp = null;
          let solTimestamp = null;

          try {
            const response = await axios.get(
              this.config.EnvConfig.databasep +
                "/feed/all_symbols/last_timestamps",
              {
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
                timeout: 5000,
              }
            );

            if (response.status === 200) {
              let data;
              data = response.data.data || undefined;
              dogeTimestamp = data.DOGE || null;
              solTimestamp = data.SOL || null;
            } else {
              throw new Error("Error fetching data from API");
            }
          } catch (_) {
            console.log("Error in getting Timestamp from API!");
            dogeTimestamp = null;
            solTimestamp = null;
          }

          const promises = nodes.map(async ({ node, saveTo }) => {
            console.log("on:", node);
            const getData = new GetDataGlassnode(node, cookieString);

            let timeStamp;

            switch (node) {
              case "SOL":
                if (!solTimestamp) break;
                timeStamp = Math.floor(new Date(solTimestamp).getTime() / 1000);

                console.log(`SOL Timestamp: ${timeStamp}`);
                break;

              case "DOGE":
                if (!dogeTimestamp) break;
                timeStamp = Math.floor(
                  new Date(dogeTimestamp).getTime() / 1000
                );

                console.log(`DOGE Timestamp: ${timeStamp}`);

                break;
            }

            let data;
            if (timeStamp) {
              data = await getData.getLast(timeStamp);
            } else {
              data = await getData.getAll();
            }

            if (!data) {
              throw new Error("data is null!");
            }

            eval(`${saveTo} = JSON.stringify(data)`);
            // (this as Eval)[saveTo] = JSON.stringify(data);

            console.log("send data to api");
            if (!this.config.Args.test) {
              await sendDataToApi(data);
            }

            console.log("running false");
            isRunning = false;
          });

          await Promise.all(promises);
        };

        const nodes = [
          { node: "SOL", saveTo: "solData" },
          { node: "DOGE", saveTo: "dogeData" },
        ];

        processNodes(nodes).then(() => {
          console.log("All nodes processed");
          try {
            fs.writeFileSync("data-sol.json", solData!);
            console.log("saved");
            fs.writeFileSync("data-doge.json", dogeData!);
            console.log("saved");
          } catch (_) {
            console.log("Error in saving data to file!");
          }
        });
      } finally {
        try {
          await browser!.close();
        } catch (_) {
          console.log("Error in closing browser");
        }
      }
    };

    let childProcess: ChildProcess | null = null;
const MAX_RETRIES = 5; // حداکثر تعداد تلاش‌های مجدد
const RETRY_DELAY = 5000; // تاخیر بین تلاش‌ها (میلی‌ثانیه)
const START_TIMEOUT = 10000; // زمان‌بندی برای شروع warp-plus (میلی‌ثانیه)

// تابع برای کشتن warp-plus
async function killWarpPlus(): Promise<void> {
  return new Promise((resolve, reject) => {
    exec("which pkill", (error) => {
      if (error) {
        console.log("[WARN] pkill command not found. Using alternative method.");
        if (childProcess && childProcess.pid) {
          process.kill(childProcess.pid); // استفاده از PID به عنوان جایگزین
          console.log(`warp-plus with PID ${childProcess.pid} has been killed.`);
          resolve();
        } else {
          console.log("[WARN] No warp-plus process found to kill.");
          resolve(); // اگر فرآیندی برای کشتن وجود ندارد، خطا نیست
        }
      } else {
        exec("pkill -f warp-plus", (error) => {
          if (error) {
            console.log(`[WARN] killing warp-plus: ${error.message}`);
            resolve(); // حتی اگر کشتن موفق نبود، ادامه بده
          } else {
            console.log("warp-plus has been killed.");
            resolve();
          }
        });
      }
    });
  });
}

// تابع برای شروع warp-plus
async function startWarpPlus(port: number): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const command = `./warp-plus --gool -b 127.0.0.1:${port} -v`;
    childProcess = exec(command);

    // زمان‌بندی برای شروع warp-plus
    const timeoutId = setTimeout(() => {
      reject(new Error("warp-plus failed to start within the specified timeout."));
    }, START_TIMEOUT);

    childProcess.stdout?.on("data", (data: string) => {
      if (data.includes("connection test successful") && !isWarpRunning) {
        isWarpRunning = true;
        clearTimeout(timeoutId); // لغو زمان‌بندی
        console.log(`warp-plus is running on port ${port}`);
        resolve(childProcess!);
      }
    });

    childProcess.stderr?.on("data", (data: string) => {
      console.error(`[ERROR] warp-plus stderr: ${data}`);
    });

    childProcess.on("exit", (code: number) => {
      console.log(`warp-plus exited with code ${code}`);
      if (code !== 0) {
        const errorMessage = `warp-plus terminated unexpectedly with code ${code}`;
        console.error(`[ERROR] ${errorMessage}`);
        reject(new Error(errorMessage));
      }
    });
  });
}

// تابع برای متوقف کردن warp-plus
async function stopWarpPlus(): Promise<void> {
  if (childProcess) {
    childProcess.kill();
    console.log("warp-plus stopped.");
  }
}

// تابع اصلی برای اجرای خودکار و تلاش مجدد
async function runWarpPlus(port: number, retries: number = MAX_RETRIES): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to start warp-plus...`);
      await killWarpPlus(); // مطمئن شو هیچ فرآیند قبلی در حال اجرا نیست
      const process = await startWarpPlus(port);
      console.log("warp-plus started successfully.");
      return; // اگر موفق شدیم، از حلقه خارج شو
    } catch (error: any) {
      console.error(`[ERROR] Attempt ${attempt} failed: ${error.message}`);
      if (attempt < retries) {
        console.log(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY)); // تاخیر قبل از تلاش مجدد
      } else {
        console.error("[FATAL] Maximum retries reached. Exiting...");
        throw new Error("Failed to start warp-plus after maximum retries.");
      }
    }
  }
}

// مدیریت خروج برنامه
function exitHandler(options: any, exitCode: any) {
  if (options.cleanup) console.log("Cleaning up...");
  try {
    stopWarpPlus().then(() => {
      if (exitCode || exitCode === 0) console.log(`Exiting with code ${exitCode}`);
      if (options.exit) process.exit();
    });
  } catch (error: any) {
    console.error(`[ERROR] Failed to stop warp-plus: ${error.message}`);
    if (options.exit) process.exit();
  }
}

// رویدادهای خروج
process.on("exit", exitHandler.bind(null, { cleanup: true }));
process.on("SIGINT", exitHandler.bind(null, { exit: true }));
process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));
process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));

    const run = () => {
      const pur = async () => {
        function findOpenPort(): Promise<number> {
          return new Promise((resolve, reject) => {
            const port = Math.floor(Math.random() * 65535) + 1;
            const server = net.createServer();

            server.listen(port, () => {
              server.close(() => resolve(port));
            });

            server.on("error", () => {
              findOpenPort().then(resolve).catch(reject);
            });
          });
        }

        try {
          await killWarpPlus();
          findOpenPort()
              .then(async (port) => {
                console.log(`warp on: ${port}`);
                await startWarpPlus(port);
                setTimeout(() => {
                  try {
                    app(port);
                  } catch (error) {
                    console.log(
                      `Error in main: ${(error as Error).message}`
                    );
                    retryCount++;
                    if (retryCount < MAX_RETRIES) {
                      console.log(
                        `Retrying... (${retryCount}/${MAX_RETRIES})`
                      );
                      pur(); // try again ..
                    } else {
                      console.log(
                        "[error] Max retries reached. Aborting... :("
                      );
                      // process.exit(1);
                    }
                  }
                }, 3000);
              });
        } catch (error) {
          console.log(`Error in main: ${(error as Error).message}`);
          retryCount++;
          if (retryCount < MAX_RETRIES) {
            console.log(`Retrying... (${retryCount}/${MAX_RETRIES})`);
            pur(); // try again ..
          } else {
            console.log("[error] Max retries reached. Aborting... :(");
            // process.exit(1);
          }
        }
      };
      let timeSc = this.config.Args.fast
        ? "*/1 * * * *"
        : this.config.EnvConfig.CRONC;
      cron.schedule(
        timeSc,
        () => {
          resetTry();
          if (isRunning) {
            console.log(
              "Previous instance is still running. Skipping this execution."
            );
            return; // اگر در حال اجرا است، از اجرای دوباره جلوگیری می‌کنیم
          }

          isRunning = true;

          setTimeout(() => {
            isRunning = false;
            stopWarpPlus();
          }, 290000);

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
