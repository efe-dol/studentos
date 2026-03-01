package handler

import (
	"encoding/json"
	"net/http"
	"time"
)

// Credentials from the request
type Credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Vertretung represents a single substitution entry
type Vertretung struct {
	Stunde     string `json:"stunde"`
	Betrifft   string `json:"betrifft"`
	Vertretung string `json:"vertretung"`
	Fach       string `json:"fach"`
	Raum       string `json:"raum"`
	Info       string `json:"info"`
}

// Vertretungsplan for a single day
type Vertretungsplan struct {
	MOTD         string        `json:"motd"`
	Vertretungen []Vertretung  `json:"vertretungen"`
}

// Response structure
type Response struct {
	Heute  Vertretungsplan `json:"heute"`
	Morgen Vertretungsplan `json:"morgen"`
	Stand  string          `json:"stand"`
}

// Handler is the Vercel serverless function
func Handler(w http.ResponseWriter, r *http.Request) {
	// CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Max-Age", "3600")
	w.Header().Set("Content-Type", "application/json")

	// Handle preflight
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	
	// Handle GET (health check)
	if r.Method == "GET" {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
		return
	}

	// Only accept POST
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse credentials
	var creds Credentials
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate credentials
	if creds.Email == "" || creds.Password == "" {
		http.Error(w, "Email and password required", http.StatusBadRequest)
		return
	}

	// TODO: Implement actual Elternportal API call here
	// For now, return mock data
	response := Response{
		Heute: Vertretungsplan{
			MOTD: "Backend nicht erreichbar - Mock Daten",
			Vertretungen: []Vertretung{
				{
					Stunde:     "3",
					Betrifft:   "10a",
					Vertretung: "Müller",
					Fach:       "Mathematik",
					Raum:       "A201",
					Info:       "Selbststudium",
				},
				{
					Stunde:     "5",
					Betrifft:   "10a",
					Fach:       "Englisch",
					Vertretung: "Schmidt",
					Raum:       "B105",
					Info:       "",
				},
			},
		},
		Morgen: Vertretungsplan{
			MOTD: "Bitte Go-Backend starten",
			Vertretungen: []Vertretung{
				{
					Stunde:     "2",
					Betrifft:   "10a",
					Vertretung: "Weber",
					Fach:       "Deutsch",
					Raum:       "A103",
					Info:       "Entfall",
				},
			},
		},
		Stand: time.Now().Format("02.01.2006 15:04"),
	}

	// Send response
	json.NewEncoder(w).Encode(response)
}
