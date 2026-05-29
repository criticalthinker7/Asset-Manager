import {
  appendSheetRow,
  badRequest,
  cleanField,
  isValidEmail,
  methodNotAllowed,
  ok,
  parseJsonBody,
  serverError,
} from "../server/googleSheets";

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return methodNotAllowed();

    const body = await parseJsonBody(request);
    if (!body) return badRequest("Invalid request body");
    if (cleanField(body.website, 100)) return ok();

    const name = cleanField(body.name, 120);
    const email = cleanField(body.email, 160).toLowerCase();
    const city = cleanField(body.city, 100);
    const country = cleanField(body.country, 100);
    const requestedSource = cleanField(body.source, 40);
    const source = requestedSource === "signout_prompt" ? "signout_prompt" : "homepage";

    if (!name || !email || !city || !country) {
      return badRequest("Name, email, city, and country are required");
    }

    if (!isValidEmail(email)) {
      return badRequest("A valid email is required");
    }

    try {
      await appendSheetRow({
        tabEnvName: "GOOGLE_WISHLIST_TAB",
        defaultTab: "Wishlist",
        values: [new Date().toISOString(), source, name, email, city, country],
      });
      return ok();
    } catch (error) {
      console.error("Wishlist submission failed", error);
      return serverError();
    }
  },
};
