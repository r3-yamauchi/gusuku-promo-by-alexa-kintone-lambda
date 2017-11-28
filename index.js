const Alexa = require("alexa-sdk");
const QueryKintoneRecords = require("./QueryKintoneRecords");
const queryKintoneRecords = new QueryKintoneRecords.QueryKintoneRecords(
  process.env.KINTONE_SUBDOMAIN, process.env.KINTONE_APP_ID, process.env.KINTONE_API_TOKEN);

let kintoneData = {};

exports.handler = function (event, context, callback) {
  queryKintoneRecords.queryRecords("")
    .then((records) => {
      const record = records[0];
      const gusuku = record["gusuku"]["value"];
      const prompt = record["prompt"]["value"];
      const subRecords = record["Table"]["value"];
      const items = {};
      subRecords.forEach((subRecord) => {
        const item = subRecord["value"];
        const topic = item["topic"]["value"];
        items[topic] = item["content"]["value"];
      });
      kintoneData = { gusuku: gusuku, prompt: prompt, items: items };

      const alexa = Alexa.handler(event, context);
      alexa.appId = process.env.APP_ID;
      alexa.registerHandlers(handlers);
      alexa.execute();
    });

};

const handlers = {
  "LaunchRequest": function () {
    this.emit("AMAZON.HelpIntent");
  },
  "AMAZON.HelpIntent": function () {
    this.emit(":ask", kintoneData.gusuku);
  },
  "GusukuIntent": function () {
    let sign = this.event.request.intent.slots.GusukuSign.value;
    let message = kintoneData.items[sign];
    if (message) {
      this.attributes["sign"] = sign;
      this.emit(":tell", message);
    } else {
      const prevSign = this.attributes["sign"];
      if (prevSign === "基本") {
        sign = "添付";
      } else if (prevSign === "添付") {
        sign = "帳票";
      } else if (prevSign === "帳票") {
        sign = "バックアップ";
      } else {
        sign = "基本";
      }
      this.attributes["sign"] = sign;
      message = kintoneData.items[sign];
      this.emit(":ask", message, kintoneData.prompt);
    }
  },
  "Unhandled": function () {
    this.emit(":ask", kintoneData.prompt, kintoneData.prompt);
  }
};
