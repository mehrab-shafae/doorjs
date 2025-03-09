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

  public async handler(cookie: string, nodes: Array<string>) {
    let dataStorage: { [key: string]: string } = {};

    let timestamps: { [key: string]: string | null } = {};

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

      // if (response.status === 201) {
      let data = response.data.data || {};

      nodes.forEach((node) => {
        timestamps[node] = data[node] || null;
      });
      // } else {
      //   throw new Error("Error fetching data from API");
      // }
    } catch (_) {
      console.log("Error in getting Timestamp from API!");
    }

    const promises = nodes.map(async (node) => {
      console.log("on:", node);
      const getData = new GetDataGlassnode(node, cookie);

      let timeStamp;

      if (timestamps[node]) {
        timeStamp = Math.floor(new Date(timestamps[node]).getTime() / 1000);
        console.log(`${node} Timestamp: ${timeStamp}`);
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

      dataStorage[node] = JSON.stringify(data);

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

    console.log("All nodes processed");

    try {
      if (this.config.Args.fast) {
        for (const [key, value] of Object.entries(dataStorage)) {
          fs.writeFileSync(`data-${key.toLowerCase()}.json`, value!);
        }
      }
    } catch (_) {
      console.log("Error in saving data to file!");
    }
  }
}
