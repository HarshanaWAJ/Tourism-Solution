import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import os from "os";

/**
 * Fully local chat/completion backend for the AI assistant.
 *
 * Runs a small instruction-tuned GGUF model directly inside the Node
 * process via node-llama-cpp — no network calls, no API keys, nothing
 * to sign up for. The model file itself is NOT committed to the repo;
 * see backend/models/README.md for how to fetch one. If no model file
 * is present every exported function fails fast and ai.js falls back
 * to deterministic rules-based replies.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MODEL_PATH = path.join(__dirname, "../../models/model.gguf");
const MODEL_PATH = process.env.LLM_MODEL_PATH
  ? path.resolve(process.cwd(), process.env.LLM_MODEL_PATH)
  : DEFAULT_MODEL_PATH;

// ── Perf knobs (all overridable via .env) ─────────────────────────────────────

// Hard timeout per inference call.
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 45_000;

// Context window — 512 is the sweet-spot for short chat on CPU.
// Larger = more RAM + slower first-token; we don't need long context for chat.
const CONTEXT_SIZE = Number(process.env.LLM_CONTEXT_SIZE) || 512;

// CPU threads for inference. Using physical core count (not hyperthreads)
// gives the best throughput for compute-bound LLM workloads.
const CPU_THREADS = Number(process.env.LLM_CPU_THREADS) || os.cpus().length;

// GPU layers: undefined = auto-detect, 0 = force CPU.
// GTX 660 (Kepler) isn't supported by modern CUDA, so default to 0 here.
// If you upgrade to a Pascal+ card, remove the LLM_GPU_LAYERS=0 line in .env.
const GPU_LAYERS = process.env.LLM_GPU_LAYERS !== undefined
  ? Number(process.env.LLM_GPU_LAYERS)
  : 0; // safe default for Kepler-era GPUs

// ── Singletons ────────────────────────────────────────────────────────────────

let llamaPromise = null;
let modelPromise = null;

function loadLlamaModule() {
  return import("node-llama-cpp");
}

async function getLlamaInstance() {
  if (!llamaPromise) {
    llamaPromise = (async () => {
      const { getLlama } = await loadLlamaModule();
      const llama = await getLlama({
        gpu: GPU_LAYERS > 0 ? "auto" : false,
      });
      console.log(`[llm] backend: ${llama.gpu ?? "cpu"} | threads: ${CPU_THREADS}`);
      return llama;
    })();
  }
  return llamaPromise;
}

async function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      if (!fs.existsSync(MODEL_PATH)) {
        throw new Error(
          `No local LLM model found at "${MODEL_PATH}". ` +
          `See backend/models/README.md for setup instructions.`
        );
      }
      console.log(`[llm] loading: ${path.basename(MODEL_PATH)}`);
      const llama = await getLlamaInstance();
      const model = await llama.loadModel({
        modelPath: MODEL_PATH,
        gpuLayers: GPU_LAYERS,
      });
      console.log("[llm] model loaded ✓");
      return model;
    })();
  }
  return modelPromise;
}

// ── Public helpers ────────────────────────────────────────────────────────────

export function localModelFileExists() {
  return fs.existsSync(MODEL_PATH);
}

export function getModelPath() {
  return MODEL_PATH;
}

function withTimeout(promise, ms, label = "LLM inference") {
  let timer;
  const race = Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
        ms
      );
    }),
  ]);
  return race.finally(() => clearTimeout(timer));
}

/**
 * Run a single prompt and return the plain-text reply.
 *
 * Default maxTokens is kept intentionally tiny (80) for chat on CPU:
 *   80 tokens × 4 tok/s ≈ 20 s — well inside the 45 s timeout.
 * Increase via the timeoutMs / maxTokens options for longer outputs
 * (e.g. trip planning).
 */
export async function runLocalLlm(
  prompt,
  { systemPrompt, temperature = 0.7, maxTokens = 80, timeoutMs } = {}
) {
  const { LlamaChatSession } = await loadLlamaModule();
  const model = await getModel();

  // Each call gets its own small context; model weights stay loaded.
  const context = await model.createContext({
    contextSize: CONTEXT_SIZE,
    threads: CPU_THREADS,
  });

  try {
    const session = new LlamaChatSession({
      contextSequence: context.getSequence(),
      ...(systemPrompt ? { systemPrompt } : {}),
    });

    return await withTimeout(
      session.prompt(prompt, { temperature, maxTokens }),
      timeoutMs ?? LLM_TIMEOUT_MS
    );
  } finally {
    context.dispose().catch(() => {});
  }
}
