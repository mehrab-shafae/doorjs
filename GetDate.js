import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createLogger, format, transports } from 'winston';
import axios from 'axios';
import moment from 'moment-timezone';
import { abc_get_data } from './abc_get_data.js';
import fs from 'fs';

function convertTimestampToISO(timestampInt) {
    return moment.unix(timestampInt)
        .tz("UTC")
        .toISOString()
        .replace("+00:00", "Z");
}

// Constants
const LEVEL_LOGGING = 'info';
const TIME_SLEEP = 10;
const ENDPOINT_GLASSNODE_TX = "https://api.glassnode.com/v1/metrics/transactions/count";
const ENDPOINT_GLASSNODE_FEE = "https://api.glassnode.com/v1/metrics/fees/volume_sum";
const HEADER_GLASSNODE_REQUESTS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0',
  'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132", "Microsoft Edge";v="132"'
};

// Configure logger
const logsDir = join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

const logger = createLogger({
  level: LEVEL_LOGGING,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.File({
      filename: join(logsDir, 'Sol_Offline.log'),
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(info => `${info.timestamp} - ${info.level} - ${info.message}`)
      )
    }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(info => `${info.level}: ${info.message}`)
      ),
      level: 'error'
    })
  ]
});

class GetDataGlassnode extends abc_get_data {
  constructor(symbol, authHeadersGlassnode) {
    super();
    this.symbol = symbol;
    this.authHeaders = authHeadersGlassnode;
    this.endpointTx = ENDPOINT_GLASSNODE_TX;
    this.endpointFee = ENDPOINT_GLASSNODE_FEE;

    const PARAMS_GLASSNODE_TX = { a: symbol, i: "24h", referrer: "charts" };
    const PARAMS_GLASSNODE_FEE = { a: symbol, i: "24h", referrer: "charts" };


    this.paramsTx = { ...PARAMS_GLASSNODE_TX };
    this.paramsFee = { ...PARAMS_GLASSNODE_FEE };
    this.headers = { ...HEADER_GLASSNODE_REQUESTS };
  }

  async _checkConnection(status, lastTimestamp = null) {
    // if (this.symbol !== "SOL" || this.symbol !== "DOGE") {
    //   logger.error(`Input is incorrect, ${this.symbol} != SOL/DOGE`);
    //   return null;
    // }

    this.headers.cookie = this.authHeaders;

    try {
      let responseTx, responseFee;
      
      if (status === 'all') {
        [responseTx, responseFee] = await Promise.all([
          axios.get(this.endpointTx, { params: this.paramsTx, headers: this.headers, timeout: 10000 }),
          axios.get(this.endpointFee, { params: this.paramsFee, headers: this.headers, timeout: 10000 })
        ]);
      } else if (status === 'last') {
        const txParams = { ...this.paramsTx, s: lastTimestamp.toString() };
        const feeParams = { ...this.paramsFee, s: lastTimestamp.toString() };
        
        [responseTx, responseFee] = await Promise.all([
          axios.get(this.endpointTx, { params: txParams, headers: this.headers, timeout: 10000 }),
          axios.get(this.endpointFee, { params: feeParams, headers: this.headers, timeout: 10000 })
        ]);
      } else {
        return null;
      }

      if (responseTx.status === 200 && responseFee.status === 200) {
        logger.info('Glassnode connection successful');
        return { tx: responseTx.data, fee: responseFee.data };
      }

      if ([responseTx.status, responseFee.status].includes(400)) {
        logger.warning('Bad timestamp parameter');
        return 'bad timestamp parameter';
      }

      logger.error('Connection to Glassnode failed');
      return null;
    } catch (error) {
      logger.error(`Connection error: ${error.message}`);
      return null;
    }
  }

  _timestampToISO(timestamp) {
    return convertTimestampToISO(timestamp);
  }

  async getAll() {
    const connectionResult = await this._checkConnection('all');
    if (!connectionResult || typeof connectionResult === 'string') {
      return null;
    }

    return this._processData(connectionResult);
  }

  async getLast(lastTimestamp) {
    const connectionResult = await this._checkConnection('last', lastTimestamp);
    if (!connectionResult) return null;
    if (typeof connectionResult === 'string') return [];

    return this._processData(connectionResult);
  }

  _processData({ tx, fee }) {
    const processedData = [];
    const txData = tx.reduce((acc, item) => {
      acc[item.t] = { transactions: item.v };
      return acc;
    }, {});
    
    fee.forEach(item => {
      if (txData[item.t]) {
        txData[item.t].fees = item.v;
      }
    });

    for (const [timestamp, values] of Object.entries(txData)) {
      processedData.push({
        symbol: this.symbol,
        time: parseInt(timestamp), // this._timestampToISO
        number_of_transactions: values.transactions,
        total_fees_unit: values.fees || null
      });
    }

    return processedData;
  }
}

const authHeadersGlassnode = "_gcl_au=1.1.283463486.1737619791; _hjSessionUser_1425107=eyJpZCI6IjdkMjA4ZDk5LTcwYmQtNWYxZi04ODQ4LTc4ZWFmZjFhZGE5NSIsImNyZWF0ZWQiOjE3Mzc2MTk4MDM5NDksImV4aXN0aW5nIjp0cnVlfQ==; _ga_YYWW6JR31S=GS1.1.1738139037.1.1.1738139080.0.0.0; _gid=GA1.2.607682865.1738475245; _legacy_auth0.M5sT98VT4FUrQNn1p96VeTnR2iTr6qou.is.authenticated=true; auth0.M5sT98VT4FUrQNn1p96VeTnR2iTr6qou.is.authenticated=true; _hjSession_1425107=eyJpZCI6IjcyNDhiZjUyLWJiMWEtNDQzOC04YWIxLWFhNTg5NDJhNWYwYyIsImMiOjE3Mzg2NzUyNzE0NjIsInMiOjAsInIiOjAsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjowLCJzcCI6MH0=; ajs_user_id=cus_VayYNBDomLpb5wLj; ajs_anonymous_id=a6f08ab9-c482-4075-9124-e891002a9501; _ga=GA1.2.1654294171.1737619798; _ga_M9YVRZCN8G=GS1.1.1738675264.32.1.1738675814.0.0.0; _ga_MT5MWT6847=GS1.1.1738675264.32.1.1738675814.6.0.0; _s=MTczODY3NTg0N3w0UGFwOVdNYjdxUEhkX044aGsyV2FhcVVuWU1Tbm1lcDRCRlM3QmpSazRBOG9DcFFKcWdWbjBtYUhlVWRHWFk9fHXUqqSAQrsomD1YrFfgRfHIDzD6jSy06CXvBxmLRI5n";

(async () => {

  // let solData, dogeData; // objects finally
  // const nodes = [{node: "SOL", saveTo: solData}, {node: "DOGE", saveTo: dogeData}];
  // nodes.forEach(node => {
  //   console.log("node: ", node)
  //   node.forEach(dot => {
  //     console.log("dot: ", dot)
  //   });
  //   // const getData = new GetDataGlassnode(node, authHeadersGlassnode);
  //   // console.log(await getData.getAll());
  //   // const data = await getData.getAll();
  // });


  let solData, dogeData; // objects finally
  const nodes = [
    { node: "SOL", saveTo: "solData" },
    { node: "DOGE", saveTo: "dogeData" }
  ];

  // const data = {
  //   SOL: { price: 20, marketCap: 1000000 },
  //   DOGE: { price: 0.5, marketCap: 500000 }
  // };

  // nodes.forEach(async ({ node, saveTo }) => {
  //   // if (node in data) {
  //   //   eval(`${saveTo} = data[node]`);
  //   // }

  //   console.log(node);
    const getData = new GetDataGlassnode("SOL", authHeadersGlassnode);
    console.log(await getData.getAll());
    const data = await getData.getAll();

    console.log('solData: ', data);
    return;
    // eval(`${saveTo} = JSON.stringify(data)`);

    // 
    // fs.writeFile('data-sol.json', solData, (err) => {
    //   if (err) {
    //       console.error(err);
    //   } else {
    //       console.log('saved');
    //   }
    //   });
  
    //   fs.writeFile('data-doge.json', dogeData, (err) => {
    //     if (err) {
    //         console.error(err);
    //     } else {
    //         console.log('saved');
    //     }
    //     });
  // });


    

  //   fs.readFile('data.json', 'utf8', (err, fileData) => {
  //     if (err) {
  //         console.error(err);
  //     } else {
  //         // console.log('Read data:', fileData);
  //         axios.post('http://172.18.8.96:8585/feed/', fileData, {
  //           headers: {
  //             'Accept': 'application/json',
  //             'Content-Type': 'application/json'
  //           }
  //         })
  //         .then(response => {
  //           console.log('Response:', response.data);
  //         })
  //         .catch(error => {
  //           console.error('Error:', error);
  //         });
  //     }
  // });

    // axios.post('http://172.18.8.96:8585/feed/', JSON.stringify(data), {
    //   headers: {
    //     'Accept': 'application/json',
    //     'Content-Type': 'application/json'
    //   }
    // })
    // .then(response => {
    //   console.log('Response:', response.data);
    // })
    // .catch(error => {
    //   console.error('Error:', error);
    // });
    

//   console.log(await getData.getLast(1738627200));
})();
