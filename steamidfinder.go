package main

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/Acidic9/go-steam/steamid"
	"github.com/Acidic9/render"
	"github.com/Acidic9/steam"
	"github.com/go-martini/martini"
	"github.com/parnurzeal/gorequest"
)

type playerSummaries struct {
	SteamID64      steamid.ID64
	DisplayName    string
	ProfileURL     string
	AvatarSmallURL string
	AvatarMedURL   string
	AvatarFullURL  string
	State          int // 0 - Offline, 1 - Online, 2 - Busy, 3 - Away, 4 - Snooze, 5 - looking to trade, 6 - looking to play
	Public         bool
	Configured     bool
	LastLogOff     int64

	RealName           string
	PrimaryGroupID     uint64
	TimeCreated        int64
	CurrentlyPlayingID int
	CurrentlyPlaying   string
	ServerIP           string
	CountryCode        string
}

const (
	siteRoot string = "www"
	apiKey   string = "E1FFB15B2C79FD99EFCE478B86B9E25A"
)

var (
	ipBlacklist = map[string]bool{"[": true, "110.175.102.25": true}
)

func init() {
	log.SetFlags(log.Lshortfile)
}

func main() {
	m := martini.Classic()

	m.Use(render.Renderer())
	m.Use(martini.Static("./www"))

	m.Get("\\/search\\/(?P<query>[^\\/]+)\\/?$", func(w http.ResponseWriter, ren render.Render, params martini.Params) {
		w.Header().Set("Access-Control-Allow-Origin", "*")

		query := params["query"]

		id64 := steamid.ResolveID(query, apiKey)
		if id64 == 0 {
			ren.JSON(http.StatusOK, struct {
				Error string `json:"error"`
			}{"Unable to find Steam ID"})
			return
		}

		var jsonResponse struct {
			Error            string       `json:"error"`
			DisplayName      string       `json:"displayName"`
			SteamID          steamid.ID   `json:"steamID"`
			SteamID64        string       `json:"steam64"`
			SteamID32        steamid.ID32 `json:"steam32"` // Expanded info
			SteamID3         steamid.ID3  `json:"steam3"`  // Expanded info
			ProfileURL       string       `json:"profileURL"`
			RealName         string       `json:"realName"` // Expanded info
			Public           bool         `json:"public"`   // Expanded info
			State            string       `json:"state"`    // Expanded info
			LastLogOff       int64        `json:"lastLogOff"`
			CountryCode      string       `json:"countryCode"`      // Expanded info
			PrimaryGroupID   uint64       `json:"primaryGroupID"`   // Expanded info
			TimeCreated      int64        `json:"timeCreated"`      // Expanded info
			CurrentlyPlaying string       `json:"currentlyPlaying"` // Expanded info
			ServerIP         string       `json:"serverIP"`         // Expanded info
		}

		playerSumaries, err := getPlayerSummaries(apiKey, steamid.ID64(id64))
		if err != nil {
			ren.JSON(http.StatusOK, struct {
				Error string `json:"error"`
			}{"Failed to retrieve Steam ID information"})
			return
		}

		steamID64 := uint64(playerSumaries.SteamID64)
		jsonResponse.DisplayName = playerSumaries.DisplayName
		jsonResponse.SteamID = playerSumaries.SteamID64.ToID()
		jsonResponse.SteamID64 = strconv.FormatUint(steamID64, 10)
		jsonResponse.SteamID32 = playerSumaries.SteamID64.To32()
		jsonResponse.SteamID3 = playerSumaries.SteamID64.To3()
		jsonResponse.ProfileURL = playerSumaries.ProfileURL
		jsonResponse.RealName = playerSumaries.RealName
		jsonResponse.Public = playerSumaries.Public
		jsonResponse.State = steam.StateToString(playerSumaries.State)
		jsonResponse.LastLogOff = playerSumaries.LastLogOff
		jsonResponse.CountryCode = playerSumaries.CountryCode
		jsonResponse.PrimaryGroupID = playerSumaries.PrimaryGroupID
		jsonResponse.TimeCreated = playerSumaries.TimeCreated
		jsonResponse.CurrentlyPlaying = playerSumaries.CurrentlyPlaying
		jsonResponse.ServerIP = playerSumaries.ServerIP

		ren.JSON(http.StatusOK, jsonResponse)
	})

	m.RunOnAddr(":8060")
}

func getPlayerSummaries(apiKey string, id64 steamid.ID64) (playerSummaries, error) {
	var (
		plySummaries        playerSummaries
		playerSummariesResp struct {
			Response struct {
				Players []struct {
					Avatar                   string `json:"avatar"`
					Avatarfull               string `json:"avatarfull"`
					Avatarmedium             string `json:"avatarmedium"`
					Communityvisibilitystate int    `json:"communityvisibilitystate"`
					Gameextrainfo            string `json:"gameextrainfo"`
					Gameid                   string `json:"gameid"`
					Gameserverip             string `json:"gameserverip"`
					Lastlogoff               int    `json:"lastlogoff"`
					Loccountrycode           string `json:"loccountrycode"`
					Locstatecode             string `json:"locstatecode"`
					Personaname              string `json:"personaname"`
					Personastate             int    `json:"personastate"`
					Personastateflags        int    `json:"personastateflags"`
					Primaryclanid            string `json:"primaryclanid"`
					Profilestate             int    `json:"profilestate"`
					Profileurl               string `json:"profileurl"`
					Realname                 string `json:"realname"`
					Steamid                  string `json:"steamid"`
					Timecreated              int    `json:"timecreated"`
				} `json:"players"`
			} `json:"response"`
		}
	)

	_, _, errs := gorequest.New().
		Get("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/").
		Param("steamids", strconv.FormatUint(uint64(id64), 10)).
		Param("key", apiKey).
		EndStruct(&playerSummariesResp)
	if errs != nil {
		return plySummaries, errors.New("failed to find player summaries")
	}

	if len(playerSummariesResp.Response.Players) == 0 {
		return plySummaries, errors.New("No player summaries found")
	}

	plySum := playerSummariesResp.Response.Players[0]
	id, _ := strconv.ParseUint(plySum.Steamid, 10, 64)
	var public bool
	if plySum.Communityvisibilitystate == 3 {
		public = true
	}
	var configured bool
	if plySum.Profilestate == 1 {
		configured = true
	}
	groupID, _ := strconv.ParseUint(plySum.Primaryclanid, 10, 64)
	gameID, _ := strconv.ParseInt(plySum.Gameid, 10, 64)
	plySummaries = playerSummaries{
		SteamID64:      steamid.ID64(id),
		DisplayName:    plySum.Personaname,
		ProfileURL:     plySum.Profileurl,
		AvatarSmallURL: plySum.Avatar,
		AvatarMedURL:   plySum.Avatarmedium,
		AvatarFullURL:  plySum.Avatarfull,
		State:          plySum.Personastate,
		Public:         public,
		Configured:     configured,
		LastLogOff:     int64(plySum.Lastlogoff),

		RealName:           plySum.Realname,
		PrimaryGroupID:     groupID,
		TimeCreated:        int64(plySum.Timecreated),
		CurrentlyPlayingID: int(gameID),
		CurrentlyPlaying:   plySum.Gameextrainfo,
		ServerIP:           plySum.Gameserverip,
		CountryCode:        plySum.Loccountrycode,
	}

	return plySummaries, nil
}

func makeTimestamp() int64 {
	return time.Now().UnixNano() / int64(time.Millisecond)
}
