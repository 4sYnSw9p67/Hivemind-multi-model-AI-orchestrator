package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
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
	ResponseLength string       `json:"responseLength"`
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

	client := &http.Client{Timeout: 45 * time.Second}
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

	// Filter out error responses and track original indices
	validResponses := make([]AIResult, 0)
	validIndices := make([]int, 0)

	for i, resp := range responses {
		if resp.Error == "" && strings.TrimSpace(resp.Output) != "" {
			modifiedResp := resp
			modifiedResp.Model = fmt.Sprintf("Response %d (%s)", len(validResponses)+1, resp.Model)
			validResponses = append(validResponses, modifiedResp)
			validIndices = append(validIndices, i)
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

	// If only one valid response, no need for master evaluation
	if len(validResponses) == 1 {
		return &MasterEvaluation{
			BestResponseIndex: validIndices[0],
			Reasoning:         fmt.Sprintf("%s provided the only successful response", responses[validIndices[0]].Model),
			Rankings: []ResponseRanking{{
				Index:     validIndices[0],
				Score:     1.0,
				Reasoning: "Only successful response",
			}},
			EvaluationTime: time.Since(start).Milliseconds(),
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
		return performSimpleEvaluationWithMapping(validResponses, validIndices, time.Since(start).Milliseconds())
	}

	// Parse evaluation result with proper index mapping
	return parseEvaluationResultWithMapping(evalResult.Output, validResponses, validIndices, time.Since(start).Milliseconds())
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

func parseEvaluationResultWithMapping(evaluation string, validResponses []AIResult, validIndices []int, evaluationTime int64) *MasterEvaluation {
	lines := strings.Split(evaluation, "\n")

	bestIndex := -1
	reasoning := "Unable to parse evaluation"
	rankings := make([]ResponseRanking, 0)

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "BEST:") {
			var evalBestIndex int
			if _, err := fmt.Sscanf(line, "BEST: %d", &evalBestIndex); err == nil {
				evalBestIndex-- // Convert to 0-based index
				if evalBestIndex >= 0 && evalBestIndex < len(validIndices) {
					bestIndex = validIndices[evalBestIndex] // Map back to original index
				}
			}
		} else if strings.HasPrefix(line, "REASONING:") {
			reasoning = strings.TrimSpace(strings.TrimPrefix(line, "REASONING:"))
		} else if strings.HasPrefix(line, "RANKINGS:") {
			rankStr := strings.TrimSpace(strings.TrimPrefix(line, "RANKINGS:"))
			rankings = parseRankingsWithMapping(rankStr, validIndices)
		}
	}

	// Validate best index
	if bestIndex < 0 || bestIndex >= len(validIndices) {
		bestIndex = validIndices[0] // Default to first valid response
	}

	return &MasterEvaluation{
		BestResponseIndex: bestIndex,
		Reasoning:         reasoning,
		Rankings:          rankings,
		EvaluationTime:    evaluationTime,
	}
}

func parseEvaluationResult(evaluation string, totalResponses int, evaluationTime int64) *MasterEvaluation {
	// Legacy function - kept for compatibility
	return parseEvaluationResultWithMapping(evaluation, nil, nil, evaluationTime)
}

func parseRankingsWithMapping(rankStr string, validIndices []int) []ResponseRanking {
	parts := strings.Split(rankStr, ",")
	rankings := make([]ResponseRanking, 0)

	for i, part := range parts {
		part = strings.TrimSpace(part)
		var responseIndex int
		if _, err := fmt.Sscanf(part, "%d", &responseIndex); err == nil {
			responseIndex-- // Convert to 0-based
			if responseIndex >= 0 && responseIndex < len(validIndices) {
				// Dynamic scoring based on position with better distribution
				score := calculatePositionalScore(i, len(parts))
				rankings = append(rankings, ResponseRanking{
					Index:     validIndices[responseIndex], // Map back to original index
					Score:     score,
					Reasoning: fmt.Sprintf("Ranked #%d by master evaluation", i+1),
				})
			}
		}
	}

	return rankings
}

func parseRankings(rankStr string) []ResponseRanking {
	parts := strings.Split(rankStr, ",")
	rankings := make([]ResponseRanking, 0)

	for i, part := range parts {
		part = strings.TrimSpace(part)
		var responseIndex int
		if _, err := fmt.Sscanf(part, "%d", &responseIndex); err == nil {
			// Dynamic scoring based on position with better distribution
			score := calculatePositionalScore(i, len(parts))
			rankings = append(rankings, ResponseRanking{
				Index:     responseIndex - 1, // Convert to 0-based
				Score:     score,
				Reasoning: fmt.Sprintf("Ranked #%d by master evaluation", i+1),
			})
		}
	}

	return rankings
}

// Calculate dynamic positional scores with better distribution
func calculatePositionalScore(position, totalItems int) float64 {
	if totalItems <= 1 {
		return 1.0
	}

	// Use exponential decay for more natural scoring distribution
	// First place gets close to 1.0, subsequent places decay exponentially
	decay := 0.85 // Decay factor (higher = less harsh penalty)
	score := math.Pow(decay, float64(position))

	// Ensure minimum score of 0.1
	if score < 0.1 {
		score = 0.1
	}

	return score
}

func performSimpleEvaluationWithMapping(validResponses []AIResult, validIndices []int, evaluationTime int64) *MasterEvaluation {
	if len(validResponses) == 0 {
		return &MasterEvaluation{
			BestResponseIndex: -1,
			Reasoning:         "No responses to evaluate",
			Rankings:          []ResponseRanking{},
			EvaluationTime:    evaluationTime,
		}
	}

	// Advanced multi-factor scoring system
	rankings := make([]ResponseRanking, len(validResponses))

	for i, resp := range validResponses {
		score := calculateAdvancedScore(resp, validResponses)
		rankings[i] = ResponseRanking{
			Index:     validIndices[i], // Use original index
			Score:     score,
			Reasoning: generateScoreReasoning(resp, score),
		}
	}

	// Sort rankings by score (highest first)
	for i := 0; i < len(rankings)-1; i++ {
		for j := i + 1; j < len(rankings); j++ {
			if rankings[j].Score > rankings[i].Score {
				rankings[i], rankings[j] = rankings[j], rankings[i]
			}
		}
	}

	bestIndex := rankings[0].Index
	bestResponse := validResponses[0]
	for _, resp := range validResponses {
		if strings.Contains(resp.Model, fmt.Sprintf("Agent-%s", strings.Split(bestResponse.Model, "-")[1])) {
			bestResponse = resp
			break
		}
	}

	return &MasterEvaluation{
		BestResponseIndex: bestIndex,
		Reasoning:         generateEvaluationReasoning(bestResponse, rankings[0].Score),
		Rankings:          rankings,
		EvaluationTime:    evaluationTime,
	}
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

	// Advanced multi-factor scoring system
	rankings := make([]ResponseRanking, len(responses))

	for i, resp := range responses {
		score := calculateAdvancedScore(resp, responses)
		rankings[i] = ResponseRanking{
			Index:     i,
			Score:     score,
			Reasoning: generateScoreReasoning(resp, score),
		}
	}

	// Sort rankings by score (highest first)
	for i := 0; i < len(rankings)-1; i++ {
		for j := i + 1; j < len(rankings); j++ {
			if rankings[j].Score > rankings[i].Score {
				rankings[i], rankings[j] = rankings[j], rankings[i]
			}
		}
	}

	bestIndex := rankings[0].Index
	bestResponse := responses[bestIndex]

	return &MasterEvaluation{
		BestResponseIndex: bestIndex,
		Reasoning:         generateEvaluationReasoning(bestResponse, rankings[0].Score),
		Rankings:          rankings,
		EvaluationTime:    evaluationTime,
	}
}

// Advanced scoring algorithm considering multiple factors
func calculateAdvancedScore(response AIResult, allResponses []AIResult) float64 {
	if response.Error != "" {
		return 0.0
	}

	output := strings.TrimSpace(response.Output)
	if output == "" {
		return 0.0
	}

	var totalScore float64

	// 1. Base Confidence Score (30% weight)
	confidenceScore := response.Confidence * 0.3
	totalScore += confidenceScore

	// 2. Response Length Score (15% weight) - optimal length between 100-1000 chars
	lengthScore := calculateLengthScore(output) * 0.15
	totalScore += lengthScore

	// 3. Content Quality Score (25% weight)
	qualityScore := calculateContentQuality(output) * 0.25
	totalScore += qualityScore

	// 4. Processing Efficiency Score (10% weight) - faster is better, but not at quality cost
	efficiencyScore := calculateEfficiencyScore(response.ProcessingTime) * 0.10
	totalScore += efficiencyScore

	// 5. Parameter Balance Score (10% weight) - well-balanced parameters often produce better results
	paramScore := calculateParameterScore(response.WorkerParams) * 0.10
	totalScore += paramScore

	// 6. Uniqueness Score (10% weight) - reward unique insights
	uniquenessScore := calculateUniquenessScore(output, allResponses) * 0.10
	totalScore += uniquenessScore

	// Normalize to 0-1 range
	if totalScore > 1.0 {
		totalScore = 1.0
	}
	if totalScore < 0.0 {
		totalScore = 0.0
	}

	return totalScore
}

func calculateLengthScore(output string) float64 {
	length := len(output)

	// Optimal range: 200-800 characters
	if length >= 200 && length <= 800 {
		return 1.0
	} else if length >= 100 && length <= 1200 {
		// Gradual penalty outside optimal range
		if length < 200 {
			return float64(length-100) / 100.0 // 0.0 to 1.0
		} else {
			return 1.0 - (float64(length-800) / 800.0) // 1.0 to 0.5
		}
	} else if length < 50 {
		return 0.1 // Very short responses are poor
	} else {
		return 0.3 // Very long responses may be verbose
	}
}

func calculateContentQuality(output string) float64 {
	var score float64 = 0.5 // Base score

	// Clean the output for analysis
	cleaned := strings.ToLower(output)

	// Positive indicators
	if strings.Contains(cleaned, "example") || strings.Contains(cleaned, "for instance") {
		score += 0.1 // Provides examples
	}
	if strings.Contains(cleaned, "however") || strings.Contains(cleaned, "although") || strings.Contains(cleaned, "while") {
		score += 0.1 // Shows nuanced thinking
	}
	if strings.Contains(cleaned, "because") || strings.Contains(cleaned, "therefore") || strings.Contains(cleaned, "since") {
		score += 0.1 // Provides reasoning
	}

	// Structure indicators
	sentences := strings.Split(output, ".")
	if len(sentences) >= 3 && len(sentences) <= 10 {
		score += 0.1 // Good structure
	}

	// Check for formatting (markdown, bullets, etc.)
	if strings.Contains(output, "**") || strings.Contains(output, "*") || strings.Contains(output, "-") {
		score += 0.1 // Well formatted
	}

	// Negative indicators
	if strings.Contains(cleaned, "i don't know") || strings.Contains(cleaned, "i'm not sure") {
		score -= 0.2 // Uncertainty
	}
	if len(strings.Fields(output)) < 10 {
		score -= 0.2 // Too brief
	}

	// Ensure bounds
	if score > 1.0 {
		score = 1.0
	}
	if score < 0.0 {
		score = 0.0
	}

	return score
}

func calculateEfficiencyScore(processingTime int64) float64 {
	// Convert milliseconds to seconds
	seconds := float64(processingTime) / 1000.0

	// Optimal range: 5-20 seconds (good balance of speed and quality)
	if seconds >= 5.0 && seconds <= 20.0 {
		return 1.0
	} else if seconds < 5.0 {
		// Very fast might indicate shallow processing
		return 0.7 + (seconds / 5.0 * 0.3)
	} else if seconds <= 60.0 {
		// Gradual penalty for slower responses
		return 1.0 - ((seconds - 20.0) / 40.0 * 0.5)
	} else {
		// Very slow responses get low efficiency score
		return 0.2
	}
}

func calculateParameterScore(params *WorkerParams) float64 {
	if params == nil {
		return 0.5
	}

	var score float64 = 0.5

	// Reward balanced parameters
	// Temperature: 0.4-0.9 is generally good balance
	if params.Temperature >= 0.4 && params.Temperature <= 0.9 {
		score += 0.2
	} else if params.Temperature >= 0.2 && params.Temperature <= 1.2 {
		score += 0.1
	}

	// Top K: 30-70 is usually good range
	if params.TopK >= 30 && params.TopK <= 70 {
		score += 0.2
	} else if params.TopK >= 20 && params.TopK <= 80 {
		score += 0.1
	}

	// Top P: 0.8-0.95 is typically optimal
	if params.TopP >= 0.8 && params.TopP <= 0.95 {
		score += 0.1
	}

	return math.Min(score, 1.0)
}

func calculateUniquenessScore(output string, allResponses []AIResult) float64 {
	if len(allResponses) <= 1 {
		return 0.5 // No comparison possible
	}

	outputWords := strings.Fields(strings.ToLower(output))
	if len(outputWords) == 0 {
		return 0.0
	}

	totalSimilarity := 0.0
	comparisons := 0

	for _, other := range allResponses {
		if other.Output == output || other.Error != "" {
			continue // Skip self and error responses
		}

		otherWords := strings.Fields(strings.ToLower(other.Output))
		if len(otherWords) == 0 {
			continue
		}

		// Calculate word overlap similarity
		overlap := 0
		for _, word := range outputWords {
			if len(word) > 3 { // Only count significant words
				for _, otherWord := range otherWords {
					if word == otherWord {
						overlap++
						break
					}
				}
			}
		}

		similarity := float64(overlap) / float64(len(outputWords))
		totalSimilarity += similarity
		comparisons++
	}

	if comparisons == 0 {
		return 0.5
	}

	avgSimilarity := totalSimilarity / float64(comparisons)
	uniqueness := 1.0 - avgSimilarity

	// Reward moderate uniqueness (not too similar, not completely different)
	if uniqueness >= 0.3 && uniqueness <= 0.8 {
		return uniqueness
	} else if uniqueness < 0.3 {
		return uniqueness * 0.7 // Penalty for being too similar
	} else {
		return 0.5 + (1.0-uniqueness)*0.5 // Slight penalty for being too different
	}
}

func generateScoreReasoning(response AIResult, score float64) string {
	if response.Error != "" {
		return "Error in response"
	}

	reasons := []string{}

	if score >= 0.8 {
		reasons = append(reasons, "excellent quality")
	} else if score >= 0.6 {
		reasons = append(reasons, "good quality")
	} else if score >= 0.4 {
		reasons = append(reasons, "fair quality")
	} else {
		reasons = append(reasons, "needs improvement")
	}

	if response.Confidence >= 0.8 {
		reasons = append(reasons, "high confidence")
	} else if response.Confidence >= 0.6 {
		reasons = append(reasons, "moderate confidence")
	}

	length := len(strings.TrimSpace(response.Output))
	if length >= 200 && length <= 800 {
		reasons = append(reasons, "optimal length")
	} else if length < 100 {
		reasons = append(reasons, "too brief")
	} else if length > 1000 {
		reasons = append(reasons, "verbose")
	}

	return strings.Join(reasons, ", ")
}

func generateEvaluationReasoning(bestResponse AIResult, score float64) string {
	model := bestResponse.Model
	confidence := bestResponse.Confidence
	length := len(strings.TrimSpace(bestResponse.Output))

	var quality string
	if score >= 0.8 {
		quality = "exceptional"
	} else if score >= 0.7 {
		quality = "high"
	} else if score >= 0.6 {
		quality = "good"
	} else {
		quality = "acceptable"
	}

	return fmt.Sprintf("%s provided the best response with %s quality (score: %.2f). The response demonstrates confidence (%.2f), appropriate length (%d chars), and strong content quality.",
		model, quality, score, confidence, length)
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

			// Build enhanced prompt with specialization and response length
			workerQuery := buildWorkerPrompt(query, agentConfig)

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

func buildWorkerPrompt(query string, agent Agent) string {
	var promptParts []string

	// Add specialization context if provided
	if strings.TrimSpace(agent.Specialization) != "" {
		specialization := fmt.Sprintf("Role: %s", agent.Specialization)
		promptParts = append(promptParts, specialization)
	}

	// Add response length instructions
	lengthInstructions := getResponseLengthInstructions(agent.ResponseLength)
	if lengthInstructions != "" {
		promptParts = append(promptParts, lengthInstructions)
	}

	// Add the actual query
	promptParts = append(promptParts, fmt.Sprintf("Query: %s", query))

	return strings.Join(promptParts, "\n\n")
}

func getResponseLengthInstructions(responseLength string) string {
	switch responseLength {
	case "brief":
		return "Response Length: Provide a brief response (1-2 sentences) focusing only on the key points."
	case "detailed":
		return "Response Length: Provide a detailed response (1-2 paragraphs) with explanation and context."
	case "comprehensive":
		return "Response Length: Provide a comprehensive response with full analysis, examples, and thorough explanation."
	case "unlimited":
		fallthrough
	default:
		return "Response Length: Provide a response of appropriate length for the query complexity."
	}
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
		ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
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
