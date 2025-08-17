# Hivemind App

## Overview

Hivemind is a **multi-model AI orchestrator**: a system that sends user queries to multiple GenAI models (GPT-4, Claude, LLaMA, Mistral, etc.), collects their responses, and selects the best result.  
Inspired by the idea of a **Hivemind**, where multiple voices contribute to one optimized answer.

## Architecture

### Frontend

- **Framework**: React + Tailwind + shadcn/ui
- **Features**:
  - Input box for queries
  - Dropdown to select models (or “All”)
  - Display multiple results side-by-side
  - Voting / “Pick Best” feature for user feedback

### Backend

- **Language**: Go with Gin (chosen for speed, concurrency, and simplicity)
- **Responsibilities**:
  - Accept query from frontend
  - Dispatch requests in parallel to multiple APIs
  - Aggregate results into a unified JSON response
  - Store results & votes in database

### Database

- **Supabase (Postgres)** or equivalent
- Stores:
  - Queries
  - Model responses
  - User feedback / chosen “best answer”

### Deployment

- **Backend**: Docker → Render / Fly.io / Kubernetes
- **Frontend**: Netlify or Vercel
- **DB**: Supabase (cloud-hosted Postgres)

---

## Backend in Node js

```javascript
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

async function callModel(apiUrl, apiKey, query) {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt: query }),
  });
  return res.json();
}

app.post("/query", async (req, res) => {
  const { query } = req.body;

  const [gpt, claude, llama] = await Promise.all([
    callModel(
      "https://api.openai.com/v1/chat/completions",
      process.env.OPENAI_KEY,
      query
    ),
    callModel(
      "https://api.anthropic.com/v1/messages",
      process.env.CLAUDE_KEY,
      query
    ),
    callModel("https://llama.api.url", process.env.LLAMA_KEY, query),
  ]);

  res.json({
    results: [
      { model: "GPT-4", output: gpt.choices[0].message.content },
      { model: "Claude", output: claude.output },
      { model: "LLaMA", output: llama.output },
    ],
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));
```

---

## Backend in Go Gin

### Why Go?

- Goroutines + channels make **parallel API calls** trivial
- Compiles to a single binary → easy deploy
- Strong libraries:
  - OpenAI SDK: `github.com/sashabaranov/go-openai`
  - Anthropic Claude: REST via `net/http`
  - LLaMA/Mistral: via HTTP endpoints (Ollama, vLLM, Together API)
  - Config: `github.com/joho/godotenv`

### Example Gin Skeleton

```go
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/sashabaranov/go-openai"
)

type AIResult struct {
	Model  string `json:"model"`
	Output string `json:"output"`
	Error  string `json:"error,omitempty"`
}

func callOpenAI(query string) AIResult {
	client := openai.NewClient(os.Getenv("OPENAI_API_KEY"))
	resp, err := client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model: openai.GPT4,
			Messages: []openai.ChatCompletionMessage{
				{Role: "user", Content: query},
			},
		},
	)
	if err != nil {
		return AIResult{Model: "GPT-4", Error: err.Error()}
	}
	return AIResult{Model: "GPT-4", Output: resp.Choices[0].Message.Content}
}

func callClaude(query string) AIResult {
	payload := map[string]interface{}{
		"model": "claude-3-sonnet",
		"messages": []map[string]string{
			{"role": "user", "content": query},
		},
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "https://api.anthropic.com/v1/messages",
		bytes.NewBuffer(body))
	req.Header.Set("x-api-key", os.Getenv("CLAUDE_API_KEY"))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return AIResult{Model: "Claude", Error: err.Error()}
	}
	defer resp.Body.Close()

	var res map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&res)

	return AIResult{Model: "Claude", Output: res["content"].(string)}
}

func main() {
	r := gin.Default()

	r.POST("/query", func(c *gin.Context) {
		var body struct{ Query string `json:"query"` }
		if err := c.BindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
			return
		}

		var wg sync.WaitGroup
		results := make([]AIResult, 2)
		wg.Add(2)

		go func() {
			defer wg.Done()
			results[0] = callOpenAI(body.Query)
		}()

		go func() {
			defer wg.Done()
			results[1] = callClaude(body.Query)
		}()

		wg.Wait()
		c.JSON(http.StatusOK, gin.H{"results": results})
	})

	r.Run(":8080")
}
```

---

## Naming

- The project name will be **Hivemind**.
- Focuses on “many models, one brain.”

---

## Next Steps

1. Expand Go Gin backend with:
   - Logging
   - Config via `.env`
   - Error handling & retries
   - Rate limiting
   - DB storage for queries & votes
2. Build frontend in React + Tailwind
3. Deploy MVP on Netlify + Render
4. Add ranking logic (LLM-as-a-judge + user votes)

---
