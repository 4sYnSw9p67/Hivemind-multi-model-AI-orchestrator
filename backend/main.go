package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type AIResult struct {
	Model          string        `json:"model"`
	Output         string        `json:"output"`
	Error          string        `json:"error,omitempty"`
	ProcessingTime int64         `json:"processingTime"`
	Timestamp      time.Time     `json:"timestamp"`
	Confidence     float64       `json:"confidence,omitempty"`
	WorkerParams   *WorkerParams `json:"workerParams,omitempty"`
}

type WorkerParams struct {
	Temperature float64 `json:"temperature"`
	TopK        int     `json:"top_k"`
	TopP        float64 `json:"top_p"`
	WorkerID    string  `json:"worker_id"`
}

type QueryRequest struct {
	Query  string  `json:"query"`
	Agents []Agent `json:"agents,omitempty"`
}

type Agent struct {
	Name           string       `json:"name"`
	Specialization string       `json:"specialization"`
	WorkerParams   WorkerParams `json:"workerParams"`
}

type QueryResponse struct {
	Results          []AIResult        `json:"results"`
	QueryId          string            `json:"queryId"`
	MasterEvaluation *MasterEvaluation `json:"masterEvaluation,omitempty"`
}

type MasterEvaluation struct {
	BestResponseIndex int               `json:"bestResponseIndex"`
	Reasoning         string            `json:"reasoning"`
	Rankings          []ResponseRanking `json:"rankings"`
	EvaluationTime    int64             `json:"evaluationTime"`
}

type ResponseRanking struct {
	Index     int     `json:"index"`
	Score     float64 `json:"score"`
	Reasoning string  `json:"reasoning"`
}

// Qwen API structures for LM Studio compatibility
type QwenMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type QwenRequest struct {
	Model       string        `json:"model"`
	Messages    []QwenMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
	MaxTokens   int           `json:"max_tokens"`
	TopK        int           `json:"top_k,omitempty"`
	TopP        float64       `json:"top_p,omitempty"`
	Stream      bool          `json:"stream"`
}

type QwenResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

// Configuration
const (
	QwenAPIURL = "http://localhost:1234/v1/chat/completions"
	QwenModel  = "qwen/qwen3-8b"
	NumWorkers = 4
)

// Generate randomized parameters for worker diversity
func generateWorkerParams(workerID string) WorkerParams {
	// Random temperature between 0.3 and 1.2
	temperature := 0.3 + rand.Float64()*0.9

	// Random top_k between 20 and 80
	topK := 20 + rand.Intn(61)

	// Random top_p between 0.7 and 0.95
	topP := 0.7 + rand.Float64()*0.25

	return WorkerParams{
		Temperature: temperature,
		TopK:        topK,
		TopP:        topP,
		WorkerID:    workerID,
	}
}

// Call Qwen with specific worker parameters
func callQwenWorker(ctx context.Context, query string, params WorkerParams) AIResult {
	start := time.Now()

	qwenReq := QwenRequest{
		Model: QwenModel,
		Messages: []QwenMessage{
			{Role: "user", Content: query},
		},
		Temperature: params.Temperature,
		MaxTokens:   1000,
		TopK:        params.TopK,
		TopP:        params.TopP,
		Stream:      false,
	}

	reqBody, err := json.Marshal(qwenReq)
	if err != nil {
		return AIResult{
			Model:          fmt.Sprintf("Qwen-Worker-%s", params.WorkerID),
			Error:          fmt.Sprintf("Failed to marshal request: %v", err),
			ProcessingTime: time.Since(start).Milliseconds(),
			Timestamp:      time.Now(),
			WorkerParams:   &params,
		}
	}

	req, err := http.NewRequestWithContext(ctx, "POST", QwenAPIURL, bytes.NewBuffer(reqBody))
	if err != nil {
		return AIResult{
			Model:          fmt.Sprintf("Qwen-Worker-%s", params.WorkerID),
			Error:          fmt.Sprintf("Failed to create request: %v", err),
			ProcessingTime: time.Since(start).Milliseconds(),
			Timestamp:      time.Now(),
			WorkerParams:   &params,
		}
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return AIResult{
			Model:          fmt.Sprintf("Qwen-Worker-%s", params.WorkerID),
			Error:          fmt.Sprintf("Request failed: %v", err),
			ProcessingTime: time.Since(start).Milliseconds(),
			Timestamp:      time.Now(),
			WorkerParams:   &params,
		}
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return AIResult{
			Model:          fmt.Sprintf("Qwen-Worker-%s", params.WorkerID),
			Error:          "Failed to read response",
			ProcessingTime: time.Since(start).Milliseconds(),
			Timestamp:      time.Now(),
			WorkerParams:   &params,
		}
	}

	if resp.StatusCode != http.StatusOK {
		return AIResult{
			Model:          fmt.Sprintf("Qwen-Worker-%s", params.WorkerID),
			Error:          fmt.Sprintf("API error (status %d): %s", resp.StatusCode, string(responseBody)),
			ProcessingTime: time.Since(start).Milliseconds(),
			Timestamp:      time.Now(),
			WorkerParams:   &params,
		}
	}

	var qwenResp QwenResponse
	if err := json.Unmarshal(responseBody, &qwenResp); err != nil {
		return AIResult{
			Model:          fmt.Sprintf("Qwen-Worker-%s", params.WorkerID),
			Error:          fmt.Sprintf("Failed to parse response: %v", err),
			ProcessingTime: time.Since(start).Milliseconds(),
			Timestamp:      time.Now(),
			WorkerParams:   &params,
		}
	}

	output := ""
	if len(qwenResp.Choices) > 0 {
		output = qwenResp.Choices[0].Message.Content
	}

	// Generate mock confidence based on response length and coherence
	confidence := calculateConfidence(output, params)

	return AIResult{
		Model:          fmt.Sprintf("Qwen-Worker-%s", params.WorkerID),
		Output:         output,
		ProcessingTime: time.Since(start).Milliseconds(),
		Timestamp:      time.Now(),
		Confidence:     confidence,
		WorkerParams:   &params,
	}
}

// Calculate mock confidence based on response characteristics
func calculateConfidence(output string, params WorkerParams) float64 {
	if output == "" {
		return 0.0
	}

	// Base confidence starts at 0.5
	confidence := 0.5

	// Adjust based on length (longer responses get higher confidence, up to a point)
	length := len(strings.TrimSpace(output))
	if length > 50 && length < 500 {
		confidence += 0.2
	} else if length >= 500 {
		confidence += 0.3
	}

	// Lower temperature generally means more confident responses
	tempBonus := (1.0 - params.Temperature) * 0.2
	confidence += tempBonus

	// Add some randomness
	confidence += (rand.Float64() - 0.5) * 0.1

	// Clamp between 0.1 and 1.0
	if confidence < 0.1 {
		confidence = 0.1
	}
	if confidence > 1.0 {
		confidence = 1.0
	}

	return confidence
}

// Master evaluation using Qwen with conservative parameters
func evaluateResponses(ctx context.Context, query string, responses []AIResult) *MasterEvaluation {
	start := time.Now()

	// Filter out error responses
	validResponses := make([]AIResult, 0)
	for i, resp := range responses {
		if resp.Error == "" && strings.TrimSpace(resp.Output) != "" {
			resp.Model = fmt.Sprintf("Response %d (%s)", i+1, resp.Model)
			validResponses = append(validResponses, resp)
		}
	}

	if len(validResponses) == 0 {
		return &MasterEvaluation{
			BestResponseIndex: -1,
			Reasoning:         "No valid responses to evaluate",
			Rankings:          []ResponseRanking{},
			EvaluationTime:    time.Since(start).Milliseconds(),
		}
	}

	// Create evaluation prompt
	evaluationPrompt := buildEvaluationPrompt(query, validResponses)

	// Use conservative parameters for master evaluation
	masterParams := WorkerParams{
		Temperature: 0.1, // Low temperature for consistent evaluation
		TopK:        30,
		TopP:        0.8,
		WorkerID:    "Master",
	}

	// Call Qwen for evaluation
	evalResult := callQwenWorker(ctx, evaluationPrompt, masterParams)
	if evalResult.Error != "" {
		// Fallback to simple evaluation based on confidence and length
		return performSimpleEvaluation(validResponses, time.Since(start).Milliseconds())
	}

	// Parse evaluation result
	return parseEvaluationResult(evalResult.Output, len(responses), time.Since(start).Milliseconds())
}

func buildEvaluationPrompt(query string, responses []AIResult) string {
	prompt := fmt.Sprintf(`As a master AI evaluator, analyze these responses to the query: "%s"

Responses:
`, query)

	for i, resp := range responses {
		prompt += fmt.Sprintf("\nResponse %d (%s):\n%s\n", i+1, resp.Model, resp.Output)
		if resp.WorkerParams != nil {
			prompt += fmt.Sprintf("(Parameters: temp=%.2f, confidence=%.2f)\n", resp.WorkerParams.Temperature, resp.Confidence)
		}
	}

	prompt += `
Please evaluate these responses and provide:
1. Which response is best (number 1-` + fmt.Sprintf("%d", len(responses)) + `)
2. Brief reasoning for your choice
3. Rank all responses from best to worst

Format your response as:
BEST: [number]
REASONING: [brief explanation]
RANKINGS: [comma-separated list from best to worst, e.g., "2,1,3"]`

	return prompt
}

func parseEvaluationResult(evaluation string, totalResponses int, evaluationTime int64) *MasterEvaluation {
	lines := strings.Split(evaluation, "\n")

	bestIndex := -1
	reasoning := "Unable to parse evaluation"
	rankings := make([]ResponseRanking, 0)

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "BEST:") {
			if _, err := fmt.Sscanf(line, "BEST: %d", &bestIndex); err == nil {
				bestIndex-- // Convert to 0-based index
			}
		} else if strings.HasPrefix(line, "REASONING:") {
			reasoning = strings.TrimSpace(strings.TrimPrefix(line, "REASONING:"))
		} else if strings.HasPrefix(line, "RANKINGS:") {
			rankStr := strings.TrimSpace(strings.TrimPrefix(line, "RANKINGS:"))
			rankings = parseRankings(rankStr)
		}
	}

	// Validate best index
	if bestIndex < 0 || bestIndex >= totalResponses {
		bestIndex = 0 // Default to first response
	}

	return &MasterEvaluation{
		BestResponseIndex: bestIndex,
		Reasoning:         reasoning,
		Rankings:          rankings,
		EvaluationTime:    evaluationTime,
	}
}

func parseRankings(rankStr string) []ResponseRanking {
	parts := strings.Split(rankStr, ",")
	rankings := make([]ResponseRanking, 0)

	for i, part := range parts {
		part = strings.TrimSpace(part)
		var responseIndex int
		if _, err := fmt.Sscanf(part, "%d", &responseIndex); err == nil {
			score := 1.0 - (float64(i) * 0.2) // Decreasing scores
			if score < 0.1 {
				score = 0.1
			}
			rankings = append(rankings, ResponseRanking{
				Index:     responseIndex - 1, // Convert to 0-based
				Score:     score,
				Reasoning: fmt.Sprintf("Ranked #%d by master evaluation", i+1),
			})
		}
	}

	return rankings
}

func performSimpleEvaluation(responses []AIResult, evaluationTime int64) *MasterEvaluation {
	if len(responses) == 0 {
		return &MasterEvaluation{
			BestResponseIndex: -1,
			Reasoning:         "No responses to evaluate",
			Rankings:          []ResponseRanking{},
			EvaluationTime:    evaluationTime,
		}
	}

	// Simple ranking based on confidence and response length
	bestIndex := 0
	bestScore := 0.0
	rankings := make([]ResponseRanking, len(responses))

	for i, resp := range responses {
		// Score based on confidence and response quality
		score := resp.Confidence
		if len(strings.TrimSpace(resp.Output)) > 100 {
			score += 0.1
		}

		rankings[i] = ResponseRanking{
			Index:     i,
			Score:     score,
			Reasoning: fmt.Sprintf("Confidence: %.2f", resp.Confidence),
		}

		if score > bestScore {
			bestScore = score
			bestIndex = i
		}
	}

	return &MasterEvaluation{
		BestResponseIndex: bestIndex,
		Reasoning:         "Selected based on confidence score and response quality",
		Rankings:          rankings,
		EvaluationTime:    evaluationTime,
	}
}

func processQuery(ctx context.Context, query string, agents []Agent) ([]AIResult, *MasterEvaluation) {
	// Initialize random seed
	rand.Seed(time.Now().UnixNano())

	// If no agents provided, use single master response
	if len(agents) == 0 {
		masterParams := WorkerParams{
			Temperature: 0.7,
			TopK:        40,
			TopP:        0.8,
			WorkerID:    "Master",
		}

		result := callQwenWorker(ctx, query, masterParams)
		result.Model = "Hivemind Master"

		return []AIResult{result}, nil
	}

	// Use provided agents as workers
	var wg sync.WaitGroup
	results := make([]AIResult, len(agents))

	for i, agent := range agents {
		wg.Add(1)
		go func(index int, agentConfig Agent) {
			defer wg.Done()

			// Use agent's specific parameters
			params := agentConfig.WorkerParams
			params.WorkerID = agentConfig.Name

			// Add specialization to the query if provided
			workerQuery := query
			if strings.TrimSpace(agentConfig.Specialization) != "" {
				workerQuery = fmt.Sprintf("Context: You are specialized in %s.\n\nUser Query: %s",
					agentConfig.Specialization, query)
			}

			// Call Qwen with agent-specific parameters
			result := callQwenWorker(ctx, workerQuery, params)
			result.Model = fmt.Sprintf("Agent-%s", agentConfig.Name)
			results[index] = result
		}(i, agent)
	}

	wg.Wait()

	// Master evaluation of all agent responses
	evaluation := evaluateResponses(ctx, query, results)

	return results, evaluation
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
				"error":   "Invalid request format",
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

		// Create context with timeout (increased for master evaluation)
		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer cancel()

		// Process the query with agents or master-only
		results, evaluation := processQuery(ctx, req.Query, req.Agents)

		response := QueryResponse{
			Results:          results,
			QueryId:          generateQueryId(),
			MasterEvaluation: evaluation,
		}

		c.JSON(http.StatusOK, response)
	})

	// Get available models
	r.GET("/models", func(c *gin.Context) {
		// Check if Qwen is available by making a test request
		qwenAvailable := checkQwenAvailability()

		models := []map[string]interface{}{
			{
				"name":        "Qwen Workers",
				"provider":    "Local (LM Studio)",
				"available":   qwenAvailable,
				"description": fmt.Sprintf("%d Qwen workers with randomized parameters", NumWorkers),
				"endpoint":    QwenAPIURL,
				"model":       QwenModel,
			},
			{
				"name":        "Master Evaluator",
				"provider":    "Local (LM Studio)",
				"available":   qwenAvailable,
				"description": "Qwen master AI for response evaluation and ranking",
				"endpoint":    QwenAPIURL,
				"model":       QwenModel,
			},
		}
		c.JSON(http.StatusOK, gin.H{
			"models":         models,
			"system":         "Hivemind with Qwen",
			"workers":        NumWorkers,
			"qwen_available": qwenAvailable,
		})
	})

	// Health check for Qwen
	r.GET("/qwen/health", func(c *gin.Context) {
		available := checkQwenAvailability()
		status := map[string]interface{}{
			"qwen_available": available,
			"endpoint":       QwenAPIURL,
			"model":          QwenModel,
			"workers":        NumWorkers,
		}

		if available {
			c.JSON(http.StatusOK, status)
		} else {
			c.JSON(http.StatusServiceUnavailable, status)
		}
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Check Qwen availability at startup
	qwenStatus := checkQwenAvailability()
	qwenStatusText := "❌ NOT AVAILABLE"
	if qwenStatus {
		qwenStatusText = "✅ AVAILABLE"
	}

	log.Printf("🧠 Hivemind backend starting on port %s", port)
	log.Printf("🔧 Qwen Integration: %s (%s)", qwenStatusText, QwenAPIURL)
	log.Printf("👥 Workers: %d with randomized parameters", NumWorkers)
	log.Printf("📊 Health check: http://localhost:%s/health", port)
	log.Printf("🤖 Query endpoint: http://localhost:%s/query", port)
	log.Printf("📋 Models endpoint: http://localhost:%s/models", port)
	log.Printf("🏥 Qwen health: http://localhost:%s/qwen/health", port)

	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

// Check if Qwen API is available
func checkQwenAvailability() bool {
	client := &http.Client{Timeout: 5 * time.Second}

	// Try to get models list first
	resp, err := client.Get("http://localhost:1234/v1/models")
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}

func generateQueryId() string {
	return fmt.Sprintf("query_%d", time.Now().UnixNano())
}
