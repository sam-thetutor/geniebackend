import { Permissions } from "@open-ic/openchat-botclient-ts";

const emptyPermissions = {
  chat: [],
  community: [],
  message: [],
};

export default function schema(req, res) {
  res.status(200).json({
    autonomous_config: {
      sync_api_key: true,
      permissions: Permissions.encodePermissions({
        message: ["Text", "Image", "P2pSwap", "VideoCall"],
        community: [
          "RemoveMembers",
          "ChangeRoles",
          "CreatePublicChannel",
          "CreatePrivateChannel",
        ],
        chat: ["ReadMessages"],
      }),
    },
    description:
      "This is a NewsAnchor Bot. Use it to deliver and schedule content to your community and audience.",
    commands: [
    ],
  });
}