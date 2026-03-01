package handler

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strings"
	"time"
)

// Credentials from the request
type Credentials struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	ClassName string `json:"class_name"`
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

// ElternportalClient handles login and scraping
type ElternportalClient struct {
	httpClient *http.Client
	email      string
	password   string
}

// NewClient creates a new elternportal client
func NewElternportalClient(email, password string) *ElternportalClient {
	jar, _ := cookiejar.New(nil)
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true,
		},
	}

	return &ElternportalClient{
		httpClient: &http.Client{
			Transport: transport,
			Jar:       jar,
		},
		email:    email,
		password: password,
	}
}

// Login authenticates with elternportal
func (c *ElternportalClient) Login() error {
	log.Printf("Attempting login for: %s", c.email)

	// Step 1: Get CSRF token from login page
	req, _ := http.NewRequest("GET", "https://weilgym.eltern-portal.org/", nil)
	req.Header.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	res, err := c.httpClient.Do(req)
	if err != nil {
		log.Printf("Login GET request failed: %v", err)
		return err
	}
	defer res.Body.Close()

	body, _ := io.ReadAll(res.Body)
	bodyStr := string(body)

	// Extract CSRF Token
	csrfRegex := regexp.MustCompile(`csrf'\s+value='([^']+)'`)
	matches := csrfRegex.FindStringSubmatch(bodyStr)
	if len(matches) < 2 {
		log.Printf("CSRF token not found in response")
		return fmt.Errorf("CSRF token not found")
	}
	csrfToken := matches[1]
	log.Printf("CSRF Token extracted")

	// Step 2: Login with credentials
	loginURL := "https://weilgym.eltern-portal.org/includes/project/auth/login.php"
	payload := fmt.Sprintf("csrf=%s&username=%s&password=%s&go_to=",
		csrfToken,
		url.QueryEscape(c.email),
		url.QueryEscape(c.password))

	req, _ = http.NewRequest("POST", loginURL, strings.NewReader(payload))
	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Add("Origin", "https://weilgym.eltern-portal.org")
	req.Header.Add("Referer", "https://weilgym.eltern-portal.org/")

	res, err = c.httpClient.Do(req)
	if err != nil {
		log.Printf("Login POST request failed: %v", err)
		return err
	}
	defer res.Body.Close()

	log.Printf("Login successful, response status: %d", res.StatusCode)
	return nil
}

// GetVertretungsplan fetches the substitution plan
func (c *ElternportalClient) GetVertretungsplan() (Response, error) {
	// Login first
	if err := c.Login(); err != nil {
		return Response{}, err
	}

	// Fetch Vertretungsplan
	req, _ := http.NewRequest("GET", "https://weilgym.eltern-portal.org/service/vertretungsplan", nil)
	req.Header.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Add("Referer", "https://weilgym.eltern-portal.org/start")

	res, err := c.httpClient.Do(req)
	if err != nil {
		log.Printf("Vertretungsplan request failed: %v", err)
		return Response{}, err
	}
	defer res.Body.Close()

	body, _ := io.ReadAll(res.Body)
	bodyStr := string(body)

	var plan Response

	// Parse MOTD for today and tomorrow
	motdRegex := regexp.MustCompile(`<p class="pull-left">([^<]+)</p>`)
	motds := motdRegex.FindAllStringSubmatch(bodyStr, -1)
	if len(motds) >= 1 {
		plan.Heute.MOTD = strings.TrimSpace(motds[0][1])
	}
	if len(motds) >= 2 {
		plan.Morgen.MOTD = strings.TrimSpace(motds[1][1])
	}

	// Parse substitution tables
	tableRegex := regexp.MustCompile(`<table[^>]*class="table"[^>]*>(.*?)</table>`)
	tables := tableRegex.FindAllStringSubmatch(bodyStr, -1)

	var allVertretungen []Vertretung
	tableIndex := 0

	for _, tableMatch := range tables {
		tableContent := tableMatch[1]

		// Parse table rows
		rowRegex := regexp.MustCompile(`<tr[^>]*>(.*?)</tr>`)
		rows := rowRegex.FindAllStringSubmatch(tableContent, -1)

		allVertretungen = []Vertretung{}

		for i, rowMatch := range rows {
			if i == 0 { // Skip header
				continue
			}

			rowContent := rowMatch[1]
			cellRegex := regexp.MustCompile(`<td[^>]*>([^<]*)</td>`)
			cells := cellRegex.FindAllStringSubmatch(rowContent, -1)

			if len(cells) >= 6 {
				v := Vertretung{
					Stunde:     strings.TrimSpace(cells[0][1]),
					Betrifft:   strings.TrimSpace(cells[1][1]),
					Vertretung: strings.TrimSpace(cells[2][1]),
					Fach:       strings.TrimSpace(cells[3][1]),
					Raum:       strings.TrimSpace(cells[4][1]),
					Info:       strings.TrimSpace(cells[5][1]),
				}

				if v.Stunde != "Std." && v.Stunde != "" {
					allVertretungen = append(allVertretungen, v)
				}
			}
		}

		if tableIndex == 0 {
			plan.Heute.Vertretungen = allVertretungen
		} else if tableIndex == 1 {
			plan.Morgen.Vertretungen = allVertretungen
		}
		tableIndex++
	}

	// Parse Stand
	standRegex := regexp.MustCompile(`<div[^>]*class="list[^>]*">Stand:\s+([^<]+)</div>`)
	standMatch := standRegex.FindStringSubmatch(bodyStr)
	if len(standMatch) > 1 {
		plan.Stand = strings.TrimSpace(standMatch[1])
	}

	log.Printf("Successfully parsed vertretungsplan: %d heute, %d morgen",
		len(plan.Heute.Vertretungen), len(plan.Morgen.Vertretungen))

	return plan, nil
}

// FilterByClass filters vertretungen for a specific class
func FilterByClass(plan Response, className string) Response {
	log.Printf("Filtering vertretungen for class: %s", className)
	
	// Normalize class name for matching (e.g., "10A" == "10a")
	classNameLower := strings.ToLower(className)
	
	filtered := Response{
		Heute: Vertretungsplan{
			MOTD:         plan.Heute.MOTD,
			Vertretungen: []Vertretung{},
		},
		Morgen: Vertretungsplan{
			MOTD:         plan.Morgen.MOTD,
			Vertretungen: []Vertretung{},
		},
		Stand: plan.Stand,
	}
	
	// Filter today's vertretungen
	for _, v := range plan.Heute.Vertretungen {
		if strings.ToLower(v.Betrifft) == classNameLower || strings.Contains(strings.ToLower(v.Betrifft), strings.ToLower(className)) {
			filtered.Heute.Vertretungen = append(filtered.Heute.Vertretungen, v)
		}
	}
	
	// Filter tomorrow's vertretungen
	for _, v := range plan.Morgen.Vertretungen {
		if strings.ToLower(v.Betrifft) == classNameLower || strings.Contains(strings.ToLower(v.Betrifft), strings.ToLower(className)) {
			filtered.Morgen.Vertretungen = append(filtered.Morgen.Vertretungen, v)
		}
	}
	
	log.Printf("Filtered vertretungen: %d heute, %d morgen",
		len(filtered.Heute.Vertretungen), len(filtered.Morgen.Vertretungen))
	
	return filtered
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
		log.Printf("Error decoding credentials: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate credentials
	if creds.Email == "" || creds.Password == "" {
		http.Error(w, "Email and password required", http.StatusBadRequest)
		return
	}

	log.Printf("Fetching vertretungsplan for: %s", creds.Email)

	// Create elternportal client with real credentials
	client := NewElternportalClient(creds.Email, creds.Password)

	// Fetch real data from elternportal
	vertretungen, err := client.GetVertretungsplan()
	if err != nil {
		log.Printf("Elternportal error: %v", err)

		// Fallback to error message
		response := Response{
			Heute: Vertretungsplan{
				MOTD:         fmt.Sprintf("Fehler beim Abrufen: %v", err),
				Vertretungen: []Vertretung{},
			},
			Morgen: Vertretungsplan{
				MOTD:         "Bitte versuche es später erneut",
				Vertretungen: []Vertretung{},
			},
			Stand: time.Now().Format("02.01.2006 15:04"),
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	log.Printf("Successfully fetched vertretungsplan")

	// Filter by class if provided
	if creds.ClassName != "" {
		vertretungen = FilterByClass(vertretungen, creds.ClassName)
	}

	// Send response
	json.NewEncoder(w).Encode(vertretungen)
}
