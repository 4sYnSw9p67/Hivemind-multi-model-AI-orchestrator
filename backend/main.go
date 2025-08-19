package main

import (
    "encoding/json"
    "net/http"
    "os"
    "sync"
    "context"
    "github.com/gin-gonic/gin"
    "github.com/sashabaranov/go-openai"
)

type AIResult struct {
    Model  string `json:"model"`
    Output string `json:"output"`
    Error  string `json:"error,omitempty"`
}

func callOpenAI(ctx context.Context, query string) AIResult {
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

func main() {
    r := gin.Default()

    r.POST("/query", func(c *gin.Context) {
        var body struct{ Query string `json:"query"` }
        if err := c.BindJSON(&body); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
            return
        }

        var wg sync.WaitGroup
        results := make([]AIResult, 1)
        wg.Add(1)

        go func() {
            defer wg.Done()
            results[0] = callOpenAI(c, body.Query)
        }()

        wg.Wait()
        c.JSON(http.StatusOK, gin.H{"results": results})
    })

    r.Run(":8080")
}
