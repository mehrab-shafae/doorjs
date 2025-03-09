import fs from "fs";
import axios from "axios";
import { databasepGet, databasepSave } from "../config.js";
import { GetDataGlassnode } from "./glassnode-getter.js";
import { Core } from "@marboris/core";

export abstract class Handler extends Core {
  sendDataToApi = async (data: any) => {
    try {
      const res = await axios.post(
        this.config.EnvConfig.FUNDAMENTAL_API + databasepSave,
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
    }
  };

  public async handler(cookie: string) {
    let solData: string, dogeData: string;

    const processNodes = async (
      nodes: Array<{ node: string; saveTo: string }>
    ) => {
      let dogeTimestamp = null;
      let solTimestamp = null;

      try {
        const response = await axios.get(
          this.config.EnvConfig.FUNDAMENTAL_API + databasepGet,
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            timeout: 5000,
          }
        );

        if (response.status === 201) {
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
        const getData = new GetDataGlassnode(node, cookie);

        let timeStamp;

        switch (node) {
          case "SOL":
            if (!solTimestamp) break;
            timeStamp = Math.floor(new Date(solTimestamp).getTime() / 1000);

            console.log(`SOL Timestamp: ${timeStamp}`);
            break;

          case "DOGE":
            if (!dogeTimestamp) break;
            timeStamp = Math.floor(new Date(dogeTimestamp).getTime() / 1000);

            console.log(`DOGE Timestamp: ${timeStamp}`);
            break;
        }

        let data: any;
        if (timeStamp) {
          data = await getData.getLast(timeStamp);
        } else {
          data = await getData.getAll();
        }

        if (!data) {
          throw new Error("data is null!");
        }

        eval(`${saveTo} = JSON.stringify(data)`);

        console.log("send data to api");
        await this.sendDataToApi(data);

        function getLength() {
          if (Array.isArray(data)) {
            return data.length;
          } else if (typeof data === "object" && data !== null) {
            return Object.keys(data).length;
          } else {
            return 0;
          }
        }
        console.log("length: ", getLength());
      });

      await Promise.all(promises);
    };

    const nodes = [
      { node: "SOL", saveTo: "solData" },
      { node: "DOGE", saveTo: "dogeData" },
    ];

    await processNodes(nodes);
    console.log("All nodes processed");
    try {
      if (this.config.Args.fast) {
        fs.writeFileSync("data-sol.json", solData!);
        fs.writeFileSync("data-doge.json", dogeData!);
      }
    } catch (_) {
      console.log("Error in saving data to file!");
    }
  }
}
