
export default async function executeCommand(req, res) {
    console.log("req.body", req.botClient)
    const botClient = req.botClient;

    

    const msg = await botClient.createTextMessage("Thinking...");
    msg.setFinalised(false);

    botClient
      .sendMessage(success(msg))
      .catch((err) =>
        console.error("sendTextMessage failed with: ", err)
      );





    res.status(200).json({ message: 'Command executed successfully' });
}



export function success(msg) {
    return {
      message: msg?.toResponse(),
    };
  }