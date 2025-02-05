import axios from 'axios';
import moment from 'moment';
import { abc_get_data } from './abc_get_data.js';

const LEVEL_LOGGING = 'info';
const TIME_SLEEP = 10;

const ENDPOINT_GLASSNODE_TX = "https://api.glassnode.com/v1/metrics/transactions/count";
const ENDPOINT_GLASSNODE_FEE = "https://api.glassnode.com/v1/metrics/fees/volume_sum";
const PARAMS_GLASSNODE_TX = { a: "SOL", i: "24h", referrer: "charts" };
const PARAMS_GLASSNODE_FEE = { a: "SOL", i: "24h", referrer: "charts" };

const HEADER_GLASSNODE_REQUESTS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0",
    "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132", "Microsoft Edge";v="132"'
};

class GetDataGlassnode extends abc_get_data {
    constructor(symbol, authHeadersGlassnode) {
        super();
        this.symbol = symbol;
        this.authHeaders = authHeadersGlassnode;
        this.endpointTx = ENDPOINT_GLASSNODE_TX;
        this.endpointFee = ENDPOINT_GLASSNODE_FEE;
        this.paramsTx = PARAMS_GLASSNODE_TX;
        this.paramsFee = PARAMS_GLASSNODE_FEE;
        this.headers = { ...HEADER_GLASSNODE_REQUESTS, cookie: this.authHeaders };
    }

    async _checkConnection(symbol, status, lastTimestamp = null) {
        if (symbol !== "SOL") {
            console.error(`Input is incorrect, ${this.symbol} != SOL`);
            return null;
        }

        let responseGlassnodeTx, responseGlassnodeFee;

        if (status === "all") {
            responseGlassnodeTx = await axios.get(this.endpointTx, { params: this.paramsTx, headers: this.headers });
            responseGlassnodeFee = await axios.get(this.endpointFee, { params: this.paramsFee, headers: this.headers });
        } else if (status === "last") {
            this.paramsTx.s = String(lastTimestamp);
            this.paramsFee.s = String(lastTimestamp);
            responseGlassnodeTx = await axios.get(this.endpointTx, { params: this.paramsTx, headers: this.headers });
            responseGlassnodeFee = await axios.get(this.endpointFee, { params: this.paramsFee, headers: this.headers });

            if (responseGlassnodeTx.status === 400 || responseGlassnodeFee.status === 400) {
                console.warn("bad timestamp parameter");
                return "bad timestamp parameter";
            }
        }

        if (responseGlassnodeTx.status === 200 && responseGlassnodeFee.status === 200) {
            console.info("Glassnode Connection successful");
            return {
                tx: responseGlassnodeTx.data,
                fee: responseGlassnodeFee.data
            };
        }

        console.info("Connection to Glassnode endpoint failed");
        return null;
    }

    _timestampToIso(timestampInt) {
        return moment.unix(timestampInt).toISOString();
    }

    async getAll() {
        const connectionResult = await this._checkConnection(this.symbol, "all");
        if (connectionResult === null) {
            console.error("Connection to Glassnode failed");
            return null;
        }

        const dataFrameTx = connectionResult.tx;
        const dataFrameFee = connectionResult.fee;

        const dataFrame = {
            number_of_transactions: {},
            total_fees_unit: {}
        };

        dataFrameTx.forEach(item => {
            const date = this._timestampToIso(item.t);
            dataFrame.number_of_transactions[date] = item.v;
        });

        dataFrameFee.forEach(item => {
            const date = this._timestampToIso(item.t);
            dataFrame.total_fees_unit[date] = item.v;
        });

        return dataFrame;
    }

    async getLast(lastTimestamp) {
        const connectionResult = await this._checkConnection(this.symbol, "last", lastTimestamp);
        if (connectionResult === null) {
            console.error("Connection to Glassnode failed");
            return null;
        }

        const dataFrameTx = connectionResult.tx;
        const dataFrameFee = connectionResult.fee;

        const dataFrame = {
            number_of_transactions: {},
            total_fees_unit: {}
        };

        dataFrameTx.forEach(item => {
            const date = this._timestampToIso(item.t);
            dataFrame.number_of_transactions[date] = item.v;
        });

        dataFrameFee.forEach(item => {
            const date = this._timestampToIso(item.t);
            dataFrame.total_fees_unit[date] = item.v;
        });

        return dataFrame;
    }
}

// Example usage
(async () => {
    const authHeadersGlassnode = "_gcl_au=1.1.283463486.1737619791; _hjSessionUser_1425107=eyJpZCI6IjdkMjA4ZDk5LTcwYmQtNWYxZi04ODQ4LTc4ZWFmZjFhZGE5NSIsImNyZWF0ZWQiOjE3Mzc2MTk4MDM5NDksImV4aXN0aW5nIjp0cnVlfQ==; _ga_YYWW6JR31S=GS1.1.1738139037.1.1.1738139080.0.0.0; _gid=GA1.2.607682865.1738475245; _legacy_auth0.M5sT98VT4FUrQNn1p96VeTnR2iTr6qou.is.authenticated=true; auth0.M5sT98VT4FUrQNn1p96VeTnR2iTr6qou.is.authenticated=true; _hjSession_1425107=eyJpZCI6IjcyNDhiZjUyLWJiMWEtNDQzOC04YWIxLWFhNTg5NDJhNWYwYyIsImMiOjE3Mzg2NzUyNzE0NjIsInMiOjAsInIiOjAsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjowLCJzcCI6MH0=; ajs_user_id=cus_VayYNBDomLpb5wLj; ajs_anonymous_id=a6f08ab9-c482-4075-9124-e891002a9501; _ga=GA1.2.1654294171.1737619798; _ga_M9YVRZCN8G=GS1.1.1738675264.32.1.1738675814.0.0.0; _ga_MT5MWT6847=GS1.1.1738675264.32.1.1738675814.6.0.0; _s=MTczODY3NTg0N3w0UGFwOVdNYjdxUEhkX044aGsyV2FhcVVuWU1Tbm1lcDRCRlM3QmpSazRBOG9DcFFKcWdWbjBtYUhlVWRHWFk9fHXUqqSAQrsomD1YrFfgRfHIDzD6jSy06CXvBxmLRI5n";
    const getData = new GetDataGlassnode("SOL", authHeadersGlassnode);
    
    // const allData = await getData.getAll();
    // console.log(allData);
    
    const lastData = await getData.getLast(1738627200);
    console.log(lastData);
})();
