import { BadRequestError } from "@open-ic/openchat-botclient-ts"


export function createCommandChatClient(factory) {
  
    return (req, res, next) => {
      try {
        const token = req.headers['x-oc-jwt'];
        console.log("Token: ", token);
        if (!token) {
          throw new BadRequestError(accessTokenNotFound());
        }


        (req).botClient = factory.createClientFromCommandJwt(token);
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
  
  