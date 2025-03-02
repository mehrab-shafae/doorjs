import { cwd } from './misc/cwd.js';
import * as fs from 'fs';

const config = JSON.parse(fs.readFileSync(cwd('', 'config.json'), 'utf-8'));

export let ENDPOINT_GLASSNODE_TX = config.ENDPOINT_GLASSNODE_TX;
export let ENDPOINT_GLASSNODE_FEE = config.ENDPOINT_GLASSNODE_FEE;

export let DefaultAgent = config.DefaultAgent;
export const HEADER_GLASSNODE_REQUESTS = config.HEADER_GLASSNODE_REQUESTS;

export let killWarp = config.killWarp;
export const rmWarpCache = config.rmWarpCache;
export let startWarpCmd = config.startWarpCmd;

export let WarpTimeout: number = config.WarpTimeout;
export let WarpStartDelay: number = config.WarpStartDelay;
export let KillPortDelay: number = config.KillPortDelay;

export let UnixTimeISOtz = config.UnixTimeISOtz;
export let UnixTimeISOr = config.UnixTimeISOr;

export let MAX_RETRIES = config.MAX_RETRIES;
export let MAX_RETRIES_L1 = config.MAX_RETRIES_L1;

export let HomePage = config.HomePage;
export let MainCookieName = config.MainCookieName;

export let MAX_RANDOM_PORT = config.MAX_RANDOM_PORT;

export let HomePageTimeout: number = config.HomePageTimeout;
export let chrome: string = config.chrome;

export let headless: number = config.headless;
export let proxy: number = config.proxy;

export let databasepSave: string = config.databasepSave;
export let databasepGet: string = config.databasepGet;

export let CRONC: string = config.CRONC;
export let CRONCtest: string = config.CRONCtest;

export let UtcFormat: string = config.UtcFormat;

//--------------------------------------------------------
export function initConfig(GEnv: any) {
  ENDPOINT_GLASSNODE_TX = GEnv.ENDPOINT_GLASSNODE_TX ?? ENDPOINT_GLASSNODE_TX;
  ENDPOINT_GLASSNODE_FEE =
    GEnv.ENDPOINT_GLASSNODE_FEE ?? ENDPOINT_GLASSNODE_FEE;
  //--------------------------------------------------------
  DefaultAgent = GEnv.DefaultAgent ?? DefaultAgent;
  //--------------------------------------------------------
  killWarp = GEnv.killWarp ?? killWarp;
  startWarpCmd = GEnv.startWarpCmd ?? startWarpCmd;
  //--------------------------------------------------------
  WarpTimeout = GEnv.WarpTimeout ?? WarpTimeout;
  WarpStartDelay = GEnv.WarpStartDelay ?? WarpStartDelay;
  KillPortDelay = GEnv.KillPortDelay ?? KillPortDelay;
  //--------------------------------------------------------
  UnixTimeISOtz = GEnv.UnixTimeISOtz ?? UnixTimeISOtz;
  UnixTimeISOr = GEnv.UnixTimeISOr ?? UnixTimeISOr;
  //--------------------------------------------------------
  MAX_RETRIES = GEnv.MAX_RETRIES ?? MAX_RETRIES;
  MAX_RETRIES_L1 = GEnv.MAX_RETRIES_L1 ?? MAX_RETRIES_L1;
  HomePage = GEnv.HomePage ?? HomePage;
  MainCookieName = GEnv.MainCookieName ?? MainCookieName;
  MAX_RANDOM_PORT = GEnv.MAX_RANDOM_PORT ?? MAX_RANDOM_PORT;
  //--------------------------------------------------------
  HomePageTimeout = GEnv.HomePageTimeout ?? HomePageTimeout;
  chrome = GEnv.chrome ?? chrome;
  headless = GEnv.headless ?? headless;
  proxy = GEnv.proxy ?? proxy;
  databasepSave = GEnv.databasepSave ?? databasepSave;
  databasepGet = GEnv.databasepGet ?? databasepGet;
  CRONC = GEnv.CRONC ?? CRONC;
  CRONCtest = GEnv.CRONCtest ?? CRONCtest;
  UtcFormat = GEnv.UtcFormat ?? UtcFormat;
  //--------------------------------------------------------
}
