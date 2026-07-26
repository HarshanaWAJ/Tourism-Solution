import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

/**
 * Fully local chat/completion backend for the AI assistant.
 *
 * Runs a small instruction-tuned GGUF model directly inside the Node
 * process via node-llama-cpp — no network calls, no API keys, nothing
 * to sign up for. The model file itself is NOT committed to the repo
 * (it's a few hundred MB); see backend/models/README.md for how to
 * fetch one. If no model file is present, every exported function
 * fails fast with a clear error and the routes in ai.js fall back to
 * the deterministic rules-based planner/replies, exactly like the app
 * behaved before when no cloud API key was configured.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MODEL_PATH = path.join(__dirname, "../../models/model.gguf");
const MODEL_PATH = process.env.LLM_MODEL_PATH
  ? path.resolve(process.cwd(), process.env.LLM_MODEL_PATH)
  : DEFAULT_MODEL_PATH;

let llamaPromise = null;
let modelPromise = null;

function loadLlamaModule() {
  // Lazy import so the whole app doesn't crash on boot if the native
  // module hasn't been installed/built yet on a given machine.
  return import("node-llama-cpp");
}

async function getLlamaInstance() {
  if (!llamaPromise) {
    llamaPromise = (async () => {
      const { getLlama } = await loadLlamaModule();
      return getLlama();
    })();
  }
  return llamaPromise;
}

async function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      if (!fs.existsSync(MODEL_PATH)) {
        throw new Error(
          `No local LLM model found at "${MODEL_PATH}". Download a small instruct GGUF ` +
            `model and place it there (or point LLM_MODEL_PATH at it) — see backend/models/README.md.`
        );
      }
      const llama = await getLlamaInstance();
      return llama.loadModel({ modelPath: MODEL_PATH });
    })();
  }
  return modelPromise;
}

/** Cheap check for whether a model file is configured, without loading it. */
export function localModelFileExists() {
  return fs.existsSync(MODEL_PATH);
}

export function getModelPath() {
  return MODEL_PATH;
}

/**
 * Run a single prompt through the local model and return the plain-text
 * reply. Each call gets its own context so concurrent requests don't
 * stomp on each other's conversation state; the loaded model weights
 * are shared and only loaded once per process.
 */
export async function runLocalLlm(prompt, { systemPrompt, temperature = 0.6, maxTokens = 700 } = {}) {
  const { LlamaChatSession } = await loadLlamaModule();
  const model = await getModel();
  const context = await model.createContext();
  try {
    const session = new LlamaChatSession({
      contextSequence: context.getSequence(),
      ...(systemPrompt ? { systemPrompt } : {}),
    });
    return await session.prompt(prompt, { temperature, maxTokens });
  } finally {
    await context.dispose();
  }
}
