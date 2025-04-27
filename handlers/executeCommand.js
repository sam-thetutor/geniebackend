import { BotClientFactory } from "@open-ic/openchat-botclient-ts";
import { config } from "dotenv";

config();

const factory = new BotClientFactory({
  openchatPublicKey: process.env.OC_PUBLIC,
  icHost: process.env.IC_HOST,
  openStorageCanisterId: process.env.STORAGE_INDEX_CANISTER,
  identityPrivateKey: process.env.IDENTITY_PRIVATE,
});

console.log("Factory: ", factory);

const executeCommand = async (req, res) => {
  try {
    const token = req.headers["x-oc-jwt"];
    const botClient = factory.createClientFromCommandJwt(token);
    console.log("botClient :", botClient);
    let msg = await botClient.createTextMessage(
      "Welcome to Genie, an AI-powered content platform that allows you " +
        "to manage and schedule content across your different OpenChat accounts and groups." +
        "Generate, schedule, and publish content to your OpenChat accounts with ease at your desired time." +
        "Visit https://genie.vercel.app to get started!"
    );
    msg.setFinalised(true);
    botClient.sendMessage(msg).catch((err) => {
      console.log("error :", err);
    });
  } catch (error) {
    console.error("Error executing command:", error);
    res.status(500).json({ error: error.message });
  }
};

export default executeCommand;

export function success(msg) {
  return {
    message: msg?.toResponse(),
  };
}



//  -----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEquEHzJr9605Oy796e4z7LKow46DVNUnDOQWavi86vEhRAAfdbVh/Lgmxfi44LPb6S0wnCRm9kI/XdK1DYw2Eaw==\n-----END PUBLIC KEY-----


// -----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEquEHzJr9605Oy796e4z7LKow46DVNUnDOQWavi86vEhRAAfdbVh/Lgmxfi44LPb6S0wnCRm9kI/XdK1DYw2Eaw==\n-----END PUBLIC KEY-----
