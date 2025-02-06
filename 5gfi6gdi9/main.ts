import { Core } from "@marboris/core";

new (class extends Core {
  async Main() {
    console.log("Hi");
  }
})();
