import { cwd } from "./misc/cwd.js";
import * as fs from "fs";

export const config = JSON.parse(fs.readFileSync(cwd("", "config.json"), "utf-8"));

export const MainCookieName = "_s";

export const Nodes = config.Nodes;

export const DefaultAgent = config.DefaultAgent;

export const killWarp = config.killWarp;
export const rmWarpCache = config.rmWarpCache;
export const startWarpCmd = config.startWarpCmd;

export const WarpTimeout: number = config.WarpTimeout;
export const WarpStartDelay: number = config.WarpStartDelay;
export const KillPortDelay: number = config.KillPortDelay;

export const UnixTimeISOtz = config.UnixTimeISOtz;
export const UnixTimeISOr = config.UnixTimeISOr;

export const MAX_RETRIES = config.MAX_RETRIES;
export const MAX_RETRIES_L1 = config.MAX_RETRIES_L1;

export const HomePage = config.HomePage;

export const MAX_RANDOM_PORT = config.MAX_RANDOM_PORT;

export const HomePageTimeout: number = config.HomePageTimeout;
export const chrome: string = config.chrome;

export const headless: number = config.headless;
export const proxy: number = config.proxy;

export const databasepSave: string = config.databasepSave;
export const databasepGet: string = config.databasepGet;

export const CRONC: string = config.CRONC;
export const CRONCtest: string = config.CRONCtest;

export const UtcFormat: string = config.UtcFormat;

export const EndPoints: any = config.endpoints;
