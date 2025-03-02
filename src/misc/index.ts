import moment from "moment-timezone";
import { UnixTimeISOr, UnixTimeISOtz } from "../config/index.js";

//--------------------------------------------------------
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

//--------------------------------------------------------
export function convertTimestampToISO(timestampInt: number) {
  return moment
    .unix(timestampInt)
    .tz(UnixTimeISOtz)
    .toISOString()
    .replace("+00:00", UnixTimeISOr);
}
