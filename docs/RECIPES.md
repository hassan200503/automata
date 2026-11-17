# Recipes — 10 things to try with Automata

You only need one thing to make Automata useful: a model key. The [60-second quickstart](../README.md#60-second-quickstart) walks you through getting a free one.

Once it is set up, say (or type) these. Everything below runs against the real tool registry — no mock commands.

---

### 1. Read my unread mail aloud

```
"read my unread email"
```

Automata fetches your recent mail through the email tools, scores it for importance, and speaks a short summary. Configure the account first in **Settings → Email**; nothing is invented when the mailbox is disconnected.

### 2. Play some lo-fi

```
"play some lo-fi"
```

Media resolution goes local index → Spotify → YouTube search, then playback is confirmed before Automata says it worked.

### 3. Goodnight — lock the PC

```
"goodnight"
```

A natural-language shortcut for lock / sleep. Say `"sleep in 10 minutes"` to schedule it instead.

### 4. Open VS Code

```
"open VS Code"
```

Launches a named application from the start-app index.

### 5. Set the volume and mute

```
"set volume to 30"
"mute"
"next track"
```

System-audio and media-key control — the whole transport, by voice.

### 6. Read a web page aloud

```
"read https://example.com aloud"
```

The page is fetched, the main text is extracted, and a sanitized, untrusted-content-tagged version is spoken. It never injects raw page text into the prompt.

### 7. Find a file and copy it

```
"search for *.pdf"
"copy report.txt to backup"
"create folder Reports"
```

File operations with risk classes — creating a folder is safe; deleting requires confirmation.

### 8. Call someone on WhatsApp

```
"call John on WhatsApp"
```

Drives the **WhatsApp Desktop** UI: opens the app, searches the contact, and starts the call. A spoken read-back confirms the name before dialling.

### 9. Lock the screen when I go away

```
"lock screen"
"restart in 2 minutes"
```

Power actions. Shutdown and restart always require an explicit confirmation — they are Class 3.

### 10. Ask it to think, not just act

```
"help me plan a study schedule for next week"
"what are the trade-offs between React and Vue?"
"what did I say about the budget?"
```

The cognition layer (L0–L7 prompt compilation) answers in real time, and memory search recalls what you told it earlier — with your approval before anything is kept.

---

## Turn on combined intelligence

Connect a second provider (Claude, GPT, DeepSeek, …) and enable **Combined intelligence** in **Settings → Providers**. Every request fans out to all connected models and the strongest answer wins — with an auditable per-run log.

## Got an automation you love?

Open a [Discussion](https://github.com/hassan200503/automata/discussions) and share it — we pin the best ones.

---

[← Back to the README](../README.md)
