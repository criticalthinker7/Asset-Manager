import {
  badRequest,
  methodNotAllowed,
  ok,
  parseJsonBody,
  serverError,
} from "../server/googleSheets.js";
import {
  cleanChatField,
  generateAssistantReply,
  parseChatMessages,
  type ChatUserContext,
} from "../server/chat.js";

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return methodNotAllowed();

    const body = await parseJsonBody(request);
    if (!body) return badRequest("Invalid request body");

    const messages = parseChatMessages(body.messages);
    if (!messages) return badRequest("A valid messages array ending with a user message is required");

    const user: ChatUserContext = {
      userName: cleanChatField(body.userName, 120),
      userProvince: cleanChatField(body.userProvince, 80) || "Canada",
      userDiscipline: cleanChatField(body.userDiscipline, 80),
    };

    try {
      const content = await generateAssistantReply(messages, user);
      return ok({ content });
    } catch (error) {
      console.error("Chat request failed", error);
      return serverError();
    }
  },
};
