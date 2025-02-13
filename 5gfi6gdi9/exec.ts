import { exec, ChildProcess } from "child_process";

import * as net from "net";

//--------------------------------------------------------

let childProcess: ChildProcess | null = null;

let isWarpRunning = false;

//--------------------------------------------------------

export function startWarpPlus(
  port: number,
  timeout: number = 10000
): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const command = `./warp-plus --gool -b 127.0.0.1:${port} -v`;
    childProcess = exec(command);

    const timeoutId = setTimeout(async () => {
      await stopWarpPlus();
    }, timeout);

    childProcess.stdout?.on("data", (data: string) => {
      if (data.includes("connection test successful") && !isWarpRunning) {
        isWarpRunning = true;
        clearTimeout(timeoutId);
        console.log(`warp-plus is running on port ${port}`);
        resolve(childProcess!);
      }
    });

    childProcess.stderr?.on("data", (data: string) => {
      console.error(`[Error] warp-plus stderr: ${data}`);
    });

    childProcess.on("exit", (code: number) => {
      console.log(`warp-plus exited with code ${code}`);
      if (code !== 0) {
        const errorMessage = `warp-plus terminated unexpectedly with code ${code}`;
        console.error(`[Error] ${errorMessage}`);
        isWarpRunning = false;
        reject("warp terminated unexpectedly!!");
      }
    });
  });
}

export function findOpenPort(): Promise<number> {
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

export function stopWarpPlus(): Promise<void> {
  return new Promise((resolve, _) => {
    if (childProcess) {
      childProcess.kill();
      console.log("warp-plus stopped");
    }

    exec("pkill -f warp-plus", (_) => {
      resolve();
    });
  });
}

// function exitHandler(options: any, exitCode: any) {
//   if (options.cleanup) console.log("clean");
//   try {
//     stopWarpPlus()
//       .then(() => {
//         if (exitCode || exitCode === 0) console.log(exitCode);
//         if (options.exit) process.exit();
//       })
//       .catch((error) => {
//         console.error(`[Error] ${error.message}`);
//         if (options.exit) process.exit();
//       });
//   } catch (_) {}
// }

//--------------------------------------------------------

// do something when app is closing
// process.on("exit", exitHandler.bind(null, { cleanup: true }));

// catches ctrl+c event
// process.on("SIGINT", exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
// process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));
// process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));

//--------------------------------------------------------
