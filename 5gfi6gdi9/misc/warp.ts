import { exec, ChildProcess } from "child_process";
import * as net from "net";
import { delay } from "./index.js";
import {
  killWarp,
  KillPortDelay,
  startWarpCmd,
  WarpStartDelay,
  WarpTimeout,
  MAX_RANDOM_PORT,
  rmWarpCache,
} from "../config/index.js";
import { config } from "../app/config/index.js";

class WarpManager {
  private static childProcess: ChildProcess | null = null;
  private static isWarpRunning = false;

  public static async startWarpPlus(port: number): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      const command = `./${startWarpCmd} 127.0.0.1:${port} -v`;
      this.childProcess = exec(command);

      const timeoutId = setTimeout(async () => {
        if (this.isWarpRunning) return;
        await this.stopWarpPlus();
      }, WarpTimeout);

      this.childProcess.stdout?.on("data", async (data: string) => {
        if (data.includes("connection test successful") && !this.isWarpRunning) {
          this.isWarpRunning = true;
          clearTimeout(timeoutId);
          console.log(`warp-plus is running on port ${port}`);
          await delay(WarpStartDelay);
          resolve(this.childProcess!);
        }
      });

      this.childProcess.stderr?.on("data", (data: string) => {
        console.error(`[Error] warp-plus stderr: ${data}`);
      });

      this.childProcess.on("exit", async (code: number) => {
        console.log(`warp-plus exited with code ${code}`);
        this.isWarpRunning = false;

        console.log("running false");
        config.isRunning = false;

        if (code !== 0) {
          const errorMessage = `warp-plus terminated unexpectedly with code ${code}`;
          console.error(`[Error] ${errorMessage}`);
          reject("warp terminated unexpectedly!!");
        }
      });
    });
  }

  public static async findOpenPort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const port = Math.floor(Math.random() * MAX_RANDOM_PORT) + 1;
      const server = net.createServer();

      server.listen(port, () => {
        server.close(async () => {
          await delay(KillPortDelay);
          resolve(port);
        });
      });

      server.on("error", () => {
        this.findOpenPort().then(resolve).catch(reject);
      });
    });
  }

  public static async stopWarpPlus(): Promise<void> {
    return new Promise((resolve) => {
      exec(killWarp, () => {
        exec(rmWarpCache, async () => {
          if (this.childProcess) {
            this.childProcess.kill("SIGINT");
            console.log("warp-plus stopped");
          }
          await delay(KillPortDelay);
          console.log("STOPPED");
          resolve();
        });
      });
    });
  }
}

export default WarpManager;
