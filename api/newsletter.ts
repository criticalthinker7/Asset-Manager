import {
  appendSheetRow,
  badRequest,
  cleanField,
  isValidEmail,
  methodNotAllowed,
  ok,
  parseJsonBody,
  serverError,
} from "../server/googleSheets.js";

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return methodNotAllowed();

    const body = await parseJsonBody(request);
    if (!body) return badRequest("Invalid request body");
    if (cleanField(body.website, 100)) return ok();

    const name = cleanField(body.name, 120);
    const email = cleanField(body.email, 160).toLowerCase();
    const requestedSource = cleanField(body.source, 40);
    const source = requestedSource === "signout_prompt" ? "signout_prompt" : "homepage";

    if (!email) {
      return badRequest("Email is required");
    }

    if (!isValidEmail(email)) {
      return badRequest("A valid email is required");
    }

    try {
      await appendSheetRow({
        tabEnvName: "GOOGLE_NEWSLETTER_TAB",
        defaultTab: "Newsletter",
        values: [new Date().toISOString(), source, name, email],
      });
      return ok();
    } catch (error) {
      console.error("Newsletter submission failed", error);
      return serverError();
    }
  },
};
