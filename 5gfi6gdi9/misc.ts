import moment from "moment-timezone";

//--------------------------------------------------------
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

//--------------------------------------------------------
export function convertTimestampToISO(timestampInt: number) {
  return moment
    .unix(timestampInt)
    .tz("UTC")
    .toISOString()
    .replace("+00:00", "Z");
}
