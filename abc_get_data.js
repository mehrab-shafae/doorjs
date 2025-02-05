

export class abc_get_data {
  constructor() {
    if (this.constructor === abc_get_data) {
      throw new Error("Cannot instantiate abstract class.");
    }
  }

  _checkConnection(symbol, status, lastTimestamp = null) {
    throw new Error("Method '_checkConnection' must be implemented.");
  }

  _timestampToIso(timestampInt) {
    throw new Error("Method '_timestampToIso' must be implemented.");
  }

  getAll() {
    throw new Error("Method 'getAll' must be implemented.");
  }

  getLast(lastTimestamp) {
    throw new Error("Method 'getLast' must be implemented.");
  }
}

//   class SubGetData extends GetData {
//     _checkConnection(symbol, status, lastTimestamp = null) {
//       // پیاده‌سازی متد _checkConnection
//     }

//     _timestampToIso(timestampInt) {
//       // پیاده‌سازی متد _timestampToIso
//     }

//     getAll() {
//       // پیاده‌سازی متد getAll
//     }

//     getLast(lastTimestamp) {
//       // پیاده‌سازی متد getLast
//     }
//   }

//   // برای استفاده از کلاس SubGetData
//   const subGetData = new SubGetData();
