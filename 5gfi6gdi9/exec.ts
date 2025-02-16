import { exec, ChildProcess } from "child_process";

import * as net from "net";
import { delay } from "./misc.js";
import { killWarp, KillPortDelay, startWarpCmd, WarpStartDelay, WarpTimeout, MAX_RANDOM_PORT } from "./config.js";

//--------------------------------------------------------
let childProcess: ChildProcess | null = null;
let isWarpRunning = false;

//--------------------------------------------------------
export function startWarpPlus(
  port: number
): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const command = `./${startWarpCmd} 127.0.0.1:${port} -v`;
    childProcess = exec(command);

    const timeoutId = setTimeout(async () => {
      await stopWarpPlus();
    }, WarpTimeout);

    childProcess.stdout?.on("data", async (data: string) => {
      if (data.includes("connection test successful") && !isWarpRunning) {
        isWarpRunning = true;
        clearTimeout(timeoutId);
        console.log(`warp-plus is running on port ${port}`);
        await delay(WarpStartDelay);
        resolve(childProcess!);
      }
    });

    childProcess.stderr?.on("data", (data: string) => {
      console.error(`[Error] warp-plus stderr: ${data}`);
    });

    childProcess.on("exit", async (code: number) => {
      console.log(`warp-plus exited with code ${code}`);
      isWarpRunning = false;
      if (code !== 0) {
        const errorMessage = `warp-plus terminated unexpectedly with code ${code}`;
        console.error(`[Error] ${errorMessage}`);
        await stopWarpPlus();
        reject("warp terminated unexpectedly!!");
      }
    });
  });
}

//--------------------------------------------------------
export function findOpenPort(): Promise<number> {
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
      findOpenPort().then(resolve).catch(reject);
    });
  });
}

//--------------------------------------------------------
export function stopWarpPlus(): Promise<void> {
  return new Promise((resolve, _) => {
    if (childProcess) {
      childProcess.kill();
      console.log("warp-plus stopped");
    }

    exec(killWarp, async (_) => {
      await delay(KillPortDelay);
      resolve();
    });
  });
}
