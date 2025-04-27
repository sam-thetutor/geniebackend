import { BadRequestError, BotClientFactory } from "@open-ic/openchat-botclient-ts"
import { config } from "dotenv";

config();

const factory = new BotClientFactory({
  openchatPublicKey: process.env.OC_PUBLIC,
  icHost: process.env.IC_HOST,
  openStorageCanisterId: process.env.STORAGE_INDEX_CANISTER,
  identityPrivateKey: process.env.IDENTITY_PRIVATE,
});

console.log("Factory: ", factory);
export function createCommandChatClient() {
  
    return (req, res, next) => {
      try {
        const token = req.headers['x-oc-jwt'];
        console.log("Token: ", token);
        if (!token) {
          throw new BadRequestError(accessTokenNotFound());
        }

        let client = factory.createClientFromCommandJwt(token);
        console.log("Client: ", client);
        req.botClient = client;
        console.log("Bot client created");
        next();
      } catch (err) {
        console.log("Error creating bot client: ", err);
        if (err) {
          res.status(400).send(err.message);
        } else {
          res.status(500).send(err.message);
        }
      }
    };
  }


  export function createApiChatClientWithJwt(factory) {
    return (req, res, next) => {
      try {
        req .botClient = factory.createClientFromApiKeyJwt(
          req.body
        );
        console.log("Bot client created");
        next();
      } catch (err) {
        console.log("Error creating bot client: ", err);
        if (err) {
          res.status(400).send(err.message);
        } else {
          res.status(500).send(err.message);
        }
      }
    };
  }
  
  