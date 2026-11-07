import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "personal-assistant",
  // Vercel Hobby stops a function after 300 seconds. Checkpointing runs steps back to back in one
  // request; this ends the request, and the next one resumes the run, before the platform does
  checkpointing: { maxRuntime: "150s" },
});
