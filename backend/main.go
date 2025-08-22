package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/sashabaranov/go-openai"
)

type AIResult struct {
	Model           string    `json:"model"`
	Output          string    `json:"output"`
	Error           string    `json:"error,omitempty"`
	ProcessingTime  int64     `json:"processingTime"`
	Timestamp       time.Time `json:"timestamp"`
}

type QueryRequest struct {
	Query    string   `json:"query"`
	Models   []string `json:"models,omitempty"`
	AgentIds []string `json:"agentIds,omitempty"`
}

type QueryResponse struct {
	Results []AIResult `json:"results"`
	QueryId string     `json:"queryId"`
}

// AI Model Handlers
func callOpenAI(ctx context.Context, query string) AIResult {
	start := time.Now()
	
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return AIResult{
			Model:          "GPT-4",
			Error:          "OpenAI API key not configured",
			ProcessingTime: time.Since(start).Milliseconds(),
			Timestamp:      time.Now(),
		}
	}

	client := openai.NewClient(apiKey)
	resp, err := client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model: openai.GPT4o,
			Messages: []openai.ChatCompletionMessage{
				{Role: "user", Content: query},
			},
			MaxTokens: 1000,
		},
	)
	
	if err != nil {
		return AIResult{
			Model:          "GPT-4",
			Error:          err.Error(),
			ProcessingTime: time.Since(start).Milliseconds(),
			Timestamp:      time.Now(),
		}
	}
	
	return AIResult{
		Model:          "GPT-4",
		Output:         resp.Choices[0].Message.Content,
		ProcessingTime: time.Since(start).Milliseconds(),
		Timestamp:      time.Now(),
	}
}

func callClaude(ctx context.Context, query string) AIResult {
	start := time.Now()
	
	apiKey := os.Getenv("CLAUDE_API_KEY")
	if apiKey == "" {
		return AIResult{
			Model:          "Claude-3-Sonnet",
			Error:          "Claude API key not configured",
			ProcessingTime: time.Since(start).Milliseconds(),
			Timestamp:      time.Now(),
		}
	}

	payload := map[string]interface{}{
		"model": "claude-3-sonnet-20240229",
		"max_tokens": 1000,
		"messages": []map[string]string{
			{"role": "user", "content": query},
		},
	}
	
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(body))
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return AIResult{
			Model:          "Claude-3-Sonnet",
			Error:          err.Error(),
			ProcessingTime: time.Since(start).Milliseconds(),
			Timestamp:      time.Now(),
		}
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return AIResult{
			Model:          "Claude-3-Sonnet",
			Error:          "Failed to read response",
			ProcessingTime: time.Since(start).Milliseconds(),
			Timestamp:      time.Now(),
		}
	}

	if resp.StatusCode != http.StatusOK {
		return AIResult{
			Model:          "Claude-3-Sonnet",
			Error:          fmt.Sprintf("API error: %s", string(responseBody)),
			ProcessingTime: time.Since(start).Milliseconds(),
			Timestamp:      time.Now(),
		}
	}

	var claudeResp struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	
	if err := json.Unmarshal(responseBody, &claudeResp); err != nil {
		return AIResult{
			Model:          "Claude-3-Sonnet",
			Error:          "Failed to parse response",
			ProcessingTime: time.Since(start).Milliseconds(),
			Timestamp:      time.Now(),
		}
	}

	output := ""
	if len(claudeResp.Content) > 0 {
		output = claudeResp.Content[0].Text
	}

	return AIResult{
		Model:          "Claude-3-Sonnet",
		Output:         output,
		ProcessingTime: time.Since(start).Milliseconds(),
		Timestamp:      time.Now(),
	}
}

// Mock implementation for models we don't have API keys for
func callMockModel(modelName, query string) AIResult {
	start := time.Now()
	
	// Simulate API delay
	time.Sleep(time.Duration(500+len(query)%1000) * time.Millisecond)
	
	responses := map[string]string{
		"LLaMA-3.1":      fmt.Sprintf("LLaMA response: This is a comprehensive answer to your query '%s'. LLaMA excels at reasoning and following instructions.", query),
		"DeepSeek-Coder": fmt.Sprintf("DeepSeek Coder response: As a coding specialist, I'll help you with '%s'. Here's my technical analysis and solution.", query),
		"Mistral-7B":     fmt.Sprintf("Mistral response: Based on your query '%s', here's a detailed explanation with practical insights.", query),
	}
	
	output, exists := responses[modelName]
	if !exists {
		output = fmt.Sprintf("Generic AI response to: %s", query)
	}
	
	return AIResult{
		Model:          modelName,
		Output:         output,
		ProcessingTime: time.Since(start).Milliseconds(),
		Timestamp:      time.Now(),
	}
}

func processQuery(ctx context.Context, query string, models []string) []AIResult {
	// Default models if none specified
	if len(models) == 0 {
		models = []string{"GPT-4", "Claude-3-Sonnet", "LLaMA-3.1", "DeepSeek-Coder"}
	}

	var wg sync.WaitGroup
	results := make([]AIResult, len(models))
	
	for i, model := range models {
		wg.Add(1)
		go func(index int, modelName string) {
			defer wg.Done()
			
			switch modelName {
			case "GPT-4":
				results[index] = callOpenAI(ctx, query)
			case "Claude-3-Sonnet":
				results[index] = callClaude(ctx, query)
			case "LLaMA-3.1", "DeepSeek-Coder", "Mistral-7B":
				results[index] = callMockModel(modelName, query)
			default:
				results[index] = callMockModel(modelName, query)
			}
		}(i, model)
	}
	
	wg.Wait()
	return results
}

func main() {
	// Set Gin mode
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// CORS configuration
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:4200", "http://localhost:3000"},
		AllowMethods:     []string{"POST", "GET", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now(),
			"version":   "1.0.0",
		})
	})

	// Main query endpoint
	r.POST("/query", func(c *gin.Context) {
		var req QueryRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid request format",
				"details": err.Error(),
			})
			return
		}

		if req.Query == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Query cannot be empty",
			})
			return
		}

		// Create context with timeout
		ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
		defer cancel()

		// Process the query
		results := processQuery(ctx, req.Query, req.Models)
		
		response := QueryResponse{
			Results: results,
			QueryId: generateQueryId(),
		}

		c.JSON(http.StatusOK, response)
	})

	// Get available models
	r.GET("/models", func(c *gin.Context) {
		models := []map[string]interface{}{
			{"name": "GPT-4", "provider": "OpenAI", "available": os.Getenv("OPENAI_API_KEY") != ""},
			{"name": "Claude-3-Sonnet", "provider": "Anthropic", "available": os.Getenv("CLAUDE_API_KEY") != ""},
			{"name": "LLaMA-3.1", "provider": "Meta", "available": true, "note": "Mock implementation"},
			{"name": "DeepSeek-Coder", "provider": "DeepSeek", "available": true, "note": "Mock implementation"},
			{"name": "Mistral-7B", "provider": "Mistral", "available": true, "note": "Mock implementation"},
		}
		c.JSON(http.StatusOK, gin.H{"models": models})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Hivemind backend starting on port %s", port)
	log.Printf("📊 Health check: http://localhost:%s/health", port)
	log.Printf("🤖 Query endpoint: http://localhost:%s/query", port)
	log.Printf("📋 Models endpoint: http://localhost:%s/models", port)
	
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func generateQueryId() string {
	return fmt.Sprintf("query_%d", time.Now().UnixNano())
}
