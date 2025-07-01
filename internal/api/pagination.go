package api

import (
	"math"
	"net/http"
	"strconv"
)

// PaginationParams contains pagination parameters
type PaginationParams struct {
	Page     int
	PageSize int
	Offset   int
}

// GetPaginationParams extracts pagination parameters from the request
func GetPaginationParams(r *http.Request) PaginationParams {
	page := 1
	pageSize := 10

	// Parse page parameter
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	// Parse page_size parameter
	if pageSizeStr := r.URL.Query().Get("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 {
			pageSize = ps
		}
	}

	// Calculate offset
	offset := (page - 1) * pageSize

	return PaginationParams{
		Page:     page,
		PageSize: pageSize,
		Offset:   offset,
	}
}

// CalculateTotalPages calculates the total number of pages
func CalculateTotalPages(totalItems, pageSize int) int {
	return int(math.Ceil(float64(totalItems) / float64(pageSize)))
}

// BuildPaginationResponse builds a pagination response
func BuildPaginationResponse(page, pageSize, totalItems int) map[string]interface{} {
	totalPages := CalculateTotalPages(totalItems, pageSize)
	
	return map[string]interface{}{
		"page":        page,
		"page_size":   pageSize,
		"total_items": totalItems,
		"total_pages": totalPages,
		"has_next":    page < totalPages,
		"has_prev":    page > 1,
	}
}