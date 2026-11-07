import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { wrapLanguageModel, type LanguageModelMiddleware } from "ai";

// The model comes from any OpenAI-compatible endpoint, configured through the environment:
// OPENAI_BASEURL (for example https://api.openai.com/v1), OPENAI_MODEL and OPENAI_API_KEY.
// They are read when a model is first needed, so importing this module works without them
const required = (name: "OPENAI_BASEURL" | "OPENAI_MODEL" | "OPENAI_API_KEY") => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
};

export const modelId = () => required("OPENAI_MODEL");

type Params = Parameters<NonNullable<LanguageModelMiddleware["transformParams"]>>[0]["params"];
type Prompt = Params["prompt"];

const SHOWN_TYPES = (mediaType: string) =>
  mediaType.startsWith("image/") || mediaType === "application/pdf";

// OpenAI-style APIs take only text in a tool message (this provider would otherwise paste a
// screenshot's base64 into the prompt as text). Images and PDFs a tool returned are moved into a
// user message that follows the tool messages, which any vision-capable model reads
export const toolFilesAsUserMessages = (prompt: Prompt): Prompt =>
  prompt.flatMap((message): Prompt => {
    if (message.role !== "tool") return [message];
    const files: Extract<Prompt[number], { role: "user" }>["content"] = [];
    const content = message.content.map((part) => {
      if (part.type !== "tool-result" || part.output.type !== "content") return part;
      const text: string[] = [];
      let moved = 0;
      for (const item of part.output.value) {
        if (item.type === "text") text.push(item.text);
        else if (item.type === "file" && SHOWN_TYPES(item.mediaType)) {
          files.push(item);
          moved++;
        } else text.push("[A file this tool returned can't be shown.]");
      }
      if (moved > 0) text.push("[The file is shown in the next message.]");
      return { ...part, output: { type: "text" as const, value: text.join("\n") } };
    });
    if (files.length === 0) return [{ ...message, content }];
    return [
      { ...message, content },
      { role: "user", content: [{ type: "text", text: "Files returned by the tools above:" }, ...files] },
    ];
  });

const toolFilesMiddleware: LanguageModelMiddleware = {
  specificationVersion: "v4",
  transformParams: async ({ params }) => ({ ...params, prompt: toolFilesAsUserMessages(params.prompt) }),
};

export const chatModel = () =>
  wrapLanguageModel({
    model: createOpenAICompatible({
      name: "openai",
      baseURL: required("OPENAI_BASEURL"),
      apiKey: required("OPENAI_API_KEY"),
      // Token counts for streamed replies, which the usage logging relies on
      includeUsage: true,
    })(modelId()),
    middleware: toolFilesMiddleware,
  });
