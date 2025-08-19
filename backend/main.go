package main

import (
    "log"
    "net/http"
    "os"
    "context"
    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
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

	// ✅ Enable CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:4200"},
		AllowMethods:     []string{"POST", "GET", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.POST("/query", func(c *gin.Context) {
		var body struct {
			Query string `json:"query"`
		}
		if err := c.BindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
			return
		}

		// Simulate AI response
		c.JSON(http.StatusOK, gin.H{
			"results": []gin.H{
				{"model": "Mock-GPT", "output": "Answer for: " + body.Query},
			},
		})
	})

	log.Println("Server running on http://localhost:8080")
	r.Run(":8080")
}
