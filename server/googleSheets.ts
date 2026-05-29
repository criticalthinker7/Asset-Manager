import { google } from "googleapis";

export type AppendRowOptions = {
  tabEnvName: "GOOGLE_WISHLIST_TAB" | "GOOGLE_NEWSLETTER_TAB";
  defaultTab: string;
  values: string[];
};

const columnLetter = (count: number) => {
  const last = String.fromCharCode(64 + count);
  return `A:${last}`;
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const ok = (body: Record<string, unknown> = { ok: true }) => json(200, body);
export const badRequest = (message: string) => json(400, { error: message });
export const methodNotAllowed = () => json(405, { error: "Method not allowed" });
export const serverError = () => json(500, { error: "Unable to save submission" });

export const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const cleanField = (value: unknown, maxLength: number) =>
  String(value ?? "").trim().slice(0, maxLength);

export const parseJsonBody = async (request: Request) => {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export async function appendSheetRow({ tabEnvName, defaultTab, values }: AppendRowOptions) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const tabName = process.env[tabEnvName] || defaultTab;

  if (!spreadsheetId || !clientEmail || !privateKey) {
    throw new Error("Missing Google Sheets environment configuration");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!${columnLetter(values.length)}`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [values],
    },
  });
}
