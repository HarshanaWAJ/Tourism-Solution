# Local LLM model

The AI planner and chat assistant (`backend/src/routes/ai.js`) run entirely
on your own machine via [node-llama-cpp](https://node-llama-cpp.withcat.ai/) —
**no API key, no cloud account, no usage fees.** All that's needed is a
GGUF model file, which is too large to commit to the repo.

## Quick setup

1. Download a small instruction-tuned GGUF model. Good options that run
   comfortably on a laptop CPU:

   | Model | Size (Q4_K_M) | Notes |
   |---|---|---|
   | Llama-3.2-3B-Instruct | ~2 GB | best quality/speed balance |
   | Llama-3.2-1B-Instruct | ~0.8 GB | fastest, still solid for chat |
   | Qwen2.5-1.5B-Instruct | ~1 GB | good multilingual support |

   You can download one with `npx`, which node-llama-cpp ships a helper for:

   ```bash
   cd backend
   npx --no node-llama-cpp pull \
     --dir ./models \
     "hf:bartowski/Llama-3.2-3B-Instruct-GGUF:Q4_K_M"
   ```

   This saves the file into `backend/models/`. Rename it (or symlink it) to
   `model.gguf`, or point `LLM_MODEL_PATH` in `backend/.env` at whatever
   filename it downloaded as.

   Alternatively, download the `.gguf` file manually from Hugging Face
   (e.g. search "Llama-3.2-3B-Instruct GGUF") and drop it in this folder.

2. Start the backend as usual:

   ```bash
   npm run dev
   ```

   The first chat/plan-trip request after startup will load the model into
   memory (a few seconds), then reuse it for subsequent requests.

## If no model file is present

The `/api/ai/chat` and `/api/ai/plan-trip` routes detect a missing model
file and fall back automatically: chat returns a message explaining the
model isn't set up yet, and trip planning falls back to a deterministic
rules-based itinerary builder. The app keeps working either way.

`*.gguf` files are gitignored — each environment (dev machine, server)
needs its own copy.
