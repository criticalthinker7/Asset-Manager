import { GRANTS, getDeadlineStatus, type Grant } from "../src/data/grants.js";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatUserContext = {
  userName: string;
  userProvince: string;
  userDiscipline: string;
};

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;

export const cleanChatField = (value: unknown, maxLength: number) =>
  String(value ?? "").trim().slice(0, maxLength);

export const parseChatMessages = (value: unknown): ChatMessage[] | null => {
  if (!Array.isArray(value)) return null;

  const messages = value
    .slice(-MAX_MESSAGES)
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const role = (entry as { role?: unknown }).role;
      const content = cleanChatField((entry as { content?: unknown }).content, MAX_MESSAGE_LENGTH);
      if ((role !== "user" && role !== "assistant") || !content) return null;
      return { role, content };
    })
    .filter((message): message is ChatMessage => message !== null);

  if (!messages.length || messages[messages.length - 1]?.role !== "user") return null;
  return messages;
};

function formatGrantLine(grant: Grant): string {
  const deadline = getDeadlineStatus(grant.close);
  return [
    grant.name,
    grant.org,
    grant.amount,
    `closes ${grant.close} (${deadline.label})`,
    `disciplines: ${grant.discipline.join(", ")}`,
    `tags: ${grant.tags.join(", ")}`,
    `eligibility: ${grant.eligibility}`,
  ].join(" | ");
}

export function buildGrantCatalogContext(): string {
  return GRANTS.map(formatGrantLine).join("\n");
}

export function buildSystemPrompt(user: ChatUserContext): string {
  return `You are the CanGrants AI Grant Assistant for Canadian artists and producers on canadianartgrants.com.

Help applicants with:
- eligibility matching and grant recommendations
- deadline triage and application planning
- drafting artist statements, project summaries, and proposal outlines

Applicant profile:
- Name: ${user.userName || "Applicant"}
- Province/territory: ${user.userProvince || "Canada"}
- Discipline: ${user.userDiscipline || "not specified"}

Rules:
- Ground recommendations in the grant catalog below. Do not invent grants, amounts, deadlines, or URLs.
- If fit is uncertain, say what to verify on the official grant page.
- Be practical, warm, and concise. Use bullet lists when comparing multiple grants.
- For drafts, ask for missing project details only when needed, then provide editable starter text.
- Do not provide legal or immigration advice.

Grant catalog:
${buildGrantCatalogContext()}`;
}

export async function generateAssistantReply(
  messages: ChatMessage[],
  user: ChatUserContext,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";
  const system = buildSystemPrompt(user);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      system,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorBody.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const text = data.content
    ?.filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Anthropic API returned an empty response");
  }

  return text;
}
