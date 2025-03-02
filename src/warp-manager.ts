import { exec, ChildProcess } from "child_process";
import * as net from "net";
import { delay } from "./misc/index.js";
import {
  killWarp,
  KillPortDelay,
  startWarpCmd,
  WarpStartDelay,
  WarpTimeout,
  MAX_RANDOM_PORT,
  rmWarpCache,
} from "./config.js";

type Panic = () => void;

class WarpManager {
  private static childProcess: ChildProcess | null | undefined = null;
  private static isWarpRunning = false;

  public static async startWarpPlus(
    port: number,
    panic: Panic
  ): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      const command = `./${startWarpCmd} 127.0.0.1:${port} -v`;
      this.childProcess = exec(command);

      const timeoutId = setTimeout(async () => {
        if (this.isWarpRunning) return;
        await this.stopWarpPlus();
      }, WarpTimeout);

      this.childProcess.stdout?.on("data", async (data: string) => {
        if (
          data.includes("connection test successful") &&
          !this.isWarpRunning
        ) {
          this.isWarpRunning = true;
          clearTimeout(timeoutId);
          console.log(`warp-plus is running on port ${port}`);
          await delay(WarpStartDelay);
          resolve(this.childProcess!);
        }
      });

      this.childProcess.stderr?.on("data", (data: string) => {
        console.log(`[Error] warp-plus stderr: ${data}`);
      });

      this.childProcess.on("exit", async (code: number) => {
        console.log(`warp-plus exited with code ${code}`);
        this.isWarpRunning = false;

        // if (code !== 0) {
        const errorMessage = `warp-plus terminated unexpectedly with code ${code}`;
        console.log(`[Error] ${errorMessage}`);
        panic();
        reject(new Error("warp terminated unexpectedly!!"));
        // }
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
            this.childProcess.kill("SIGTERM");
            console.log("warp-plus stopped");
            this.childProcess = null;
          }
          await delay(KillPortDelay);
          resolve();
        });
      });
    });
  }
}

export default WarpManager;
