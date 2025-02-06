
export class abs_get_data {
  constructor() {
    if (this.constructor === abs_get_data) {
      throw new Error("Cannot instantiate abstract class.");
    }
  }

  _checkConnection(symbol: string, status: string, lastTimestamp?: number) { // lastTimestamp default is null
    throw new Error("Method '_checkConnection' must be implemented.");
  }

  _timestampToIso(timestampInt: number) {
    throw new Error("Method '_timestampToIso' must be implemented.");
  }

  getAll() {
    throw new Error("Method 'getAll' must be implemented.");
  }

  getLast(lastTimestamp: number) {
    throw new Error("Method 'getLast' must be implemented.");
  }
}
