<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# now outline the step by step of downloading the model and coding it into the app

Here is the complete step-by-step guide, tailored to your notes retrieval use case.

***

## Prerequisites

Before you write a line of Swift, you need:[^1]

- **Mac** with Xcode 15.4+
- **iPhone 14 Pro or newer** running iOS 17+ (requires A16 chip for INT4 Neural Engine support)
- **Python 3.10+** on your Mac (for model conversion)
- ~2GB free storage on your iPhone

***

## Phase 1: Download \& Convert the Model (on your Mac)

### Step 1 — Install CoreML-LLM

Open Terminal on your Mac and run:

```bash
git clone https://github.com/john-rocky/CoreML-LLM
cd CoreML-LLM
pip install -r requirements.txt
```

This installs Apple's `coremltools`, `transformers`, and the conversion scripts.[^1]

### Step 2 — Download Gemma 4 E2B from HuggingFace

```bash
pip install huggingface_hub
huggingface-cli login   # paste your HF token (free account)
huggingface-cli download google/gemma-4-e2b-it --local-dir ./gemma4-e2b
```

This downloads ~5GB of raw PyTorch weights.[^2]

### Step 3 — Convert to CoreML `.mlpackage`

Run the conversion script included in CoreML-LLM. This takes **10–20 minutes** and automatically handles INT4 palettization and Neural Engine optimization:[^1]

```bash
python convert.py \
  --model-path ./gemma4-e2b \
  --output gemma4-e2b.mlpackage \
  --quantize int4
```

The output `gemma4-e2b.mlpackage` will be **~0.9GB** — much smaller than the raw weights.[^1]

***

## Phase 2: Integrate into Your iOS App (Xcode)

### Step 4 — Add the Model to Xcode

1. Open your Xcode project (or create a new **SwiftUI App** project)[^3]
2. Drag `gemma4-e2b.mlpackage` into the **Project Navigator** (your Resources folder)
3. Make sure **"Copy items if needed"** is checked and your app target is selected[^4]

### Step 5 — Add the EdgeLLM Swift Package

This is the easiest way to call the model with just a few lines of Swift. In Xcode:[^5]

**File → Add Package Dependencies →** enter:

```
https://github.com/john-rocky/EdgeLLM
```


### Step 6 — Write the Inference Code

Here's a minimal SwiftUI view for your notes retrieval use case — user types a prompt, Gemma responds with matching notes context:

```swift
import SwiftUI
import EdgeLLM

struct NoteSearchView: View {
    @State private var userPrompt = ""
    @State private var response = ""
    @State private var isLoading = false
    private let llm = try? EdgeLLM(model: .gemma4e2b)

    var body: some View {
        VStack {
            TextField("Ask about your notes...", text: $userPrompt)
                .textFieldStyle(.roundedBorder)
                .padding()

            Button("Search Notes") {
                Task { await runQuery() }
            }
            .disabled(isLoading)

            ScrollView {
                Text(response).padding()
            }
        }
    }

    func runQuery() async {
        isLoading = true
        // Inject relevant notes as context before the user's prompt
        let context = fetchTopNotes(for: userPrompt) // your local search
        let fullPrompt = "Notes: \(context)\n\nQuestion: \(userPrompt)"

        response = ""
        for try await token in EdgeLLM.stream(fullPrompt) {
            response += token
        }
        isLoading = false
    }
}
```


### Step 7 — Add the Local Note Pre-filter (Critical for Performance)

Don't dump all your notes into the prompt — the context window is only 2048 tokens. Use SQLite FTS5 (built into iOS) to pre-filter the top 3–5 relevant notes before passing to Gemma:[^1]

```swift
func fetchTopNotes(for query: String) -> String {
    // SQLite FTS5 full-text search — returns top 5 note snippets
    let results = NotesDatabase.shared.search(query, limit: 5)
    return results.map { "- \($0.title): \($0.body)" }.joined(separator: "\n")
}
```

This keeps every Gemma prompt short, fast (~188ms prefill), and well within the context window.[^1]

### Step 8 — Build \& First Run

1. Select your **iPhone as target device** in Xcode
2. Set your **Development Team** under Signing \& Capabilities
3. Hit **Cmd+R** to build and run
4. **The first launch takes 1–2 minutes** — CoreML compiles and caches the model for your specific chip. Every launch after that is fast[^6]

***

## Quick Reference Summary

| Phase | What Happens | Time |
| :-- | :-- | :-- |
| `git clone` + `pip install` | Install tools | 2 min |
| `huggingface-cli download` | Get raw weights | 10–20 min |
| `python convert.py` | Convert to `.mlpackage` | 10–20 min |
| Drag into Xcode | Bundle model | 30 sec |
| Add EdgeLLM SPM package | Swift API | 1 min |
| First app launch | CoreML compiles model | 1–2 min (once only) [^1] |

After that one-time setup, every note query runs **fully offline at ~11 tokens/sec using only 250MB RAM** — invisible to the rest of your app.[^1]
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^18][^19][^20][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://gemma4-ai.com/blog/gemma4-coreml-iphone

[^2]: https://www.mindstudio.ai/blog/gemma-4-e2b-e4b-edge-models-phone-local/

[^3]: https://www.techaheadcorp.com/blog/integrate-core-ml-in-app/

[^4]: https://developer.apple.com/documentation/CoreML/integrating-a-core-ml-model-into-your-app

[^5]: https://github.com/john-rocky/EdgeLLM

[^6]: https://github.com/huggingface/blog/blob/main/swift-coreml-llm.md

[^7]: https://github.com/john-rocky/CoreML-LLM

[^8]: https://dev.to/alichherawalla/how-to-run-gemma-4-on-your-iphone-in-2026-completely-offline-no-subscription-i98

[^9]: https://hoeijmakers.net/running-gemma-4-on-your-iphone/

[^10]: https://apple.github.io/coremltools/docs-guides/source/introductory-quickstart.html

[^11]: https://ai.google.dev/gemma/docs/core/model_card_4

[^12]: https://github.com/john-rocky/CoreML-Models

[^13]: https://news.ycombinator.com/item?id=47774971

[^14]: https://developer.apple.com/documentation/coreml/downloading-and-compiling-a-model-on-the-user-s-device

[^15]: https://developer.apple.com/tutorials/develop-in-swift/train-a-core-ml-model

[^16]: https://github.com/huggingface/coreml-examples

[^17]: https://www.linkedin.com/pulse/integrating-large-language-models-llms-ios-simple-guide-schumacher-rsree

[^18]: https://github.com/awslabs/MXNet2CoreML_iOS_sample_app

[^19]: https://huggingface.co/blog/swift-coreml-llm

[^20]: https://www.reddit.com/r/swift/comments/165jgva/can_you_save_an_untrained_core_ml_model_and_then/

