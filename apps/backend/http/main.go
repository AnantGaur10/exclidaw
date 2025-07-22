package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"backend/lib"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func WriteJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}
func WriteJSONHeader(w http.ResponseWriter, v any, statusCode int) {
	w.WriteHeader(statusCode)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

type key string

const userIDKey key = "user"

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("token")
		if err != nil {
			log.Printf("Cookie error: %v", err)
			http.Error(w, "Could not fetch token", http.StatusUnauthorized)
			return
		}

		// Debug: Log the raw token
		// log.Printf("Raw token: %s", cookie.Value)

		claims, err := lib.VerifyJWT(cookie.Value)
		if err != nil {
			log.Printf("JWT verification error: %v", err)
			http.Error(w, "Unauthorized BAD Token", http.StatusUnauthorized)
			return
		}

		// Debug: Log the claims
		// log.Printf("JWT Claims - ID: %s, Username: %s", claims.UserID, claims.UserName)

		var user *lib.User
		user, err = lib.UserRepositoryInstance.GetUserByName(string(claims.UserName))

		if err != nil {
			log.Printf("User lookup error: %v", err)
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		// Debug: Log the user from database
		// log.Printf("User from DB - ID: %s, Username: %s", user.ID.String(), user.UserName)

		ctx := context.WithValue(r.Context(), userIDKey, user)
		next(w, r.WithContext(ctx))
	}
}
func main() {

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		WriteJSON(w, "Hello Ji")
	})

	http.HandleFunc("/user", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {

		case "GET":
			var email string = r.URL.Query().Get("email")
			if email == "" {
				http.Error(w, "Email query parameter is required", http.StatusBadRequest)
				return
			}
			var latestUser lib.User
			result, err := lib.UserRepositoryInstance.GetUserByEmail(email)
			if err != nil {
				http.Error(w, "User not found", http.StatusNotFound)
				log.Println("Error :", err.Error())
				return
			}
			latestUser = *result
			WriteJSON(w, latestUser)

		case "POST":

			var payload lib.IncomingSignupPayload
			// Decode the request body into the User struct
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				http.Error(w, "Invalid input", http.StatusBadRequest)
				return
			}

			// Validate the payload
			err := lib.ValidatePayload(payload)
			if err != nil {
				http.Error(w, "Invalid input: "+err.Error(), http.StatusBadRequest)
				return
			}

			//Check if user exists
			var existingUser lib.User

			Password, err := bcrypt.GenerateFromPassword([]byte(payload.Password), bcrypt.DefaultCost)
			if err != nil {
				http.Error(w, "Failed to hash password", http.StatusInternalServerError)
				return
			}
			existingUser = lib.User{
				Email:    payload.Email,
				UserName: payload.UserName,
			}
			existingUser.Password = string(Password)
			user, err := lib.UserRepositoryInstance.CreateUser(&existingUser)
			if err != nil {
				if errors.Is(err, gorm.ErrDuplicatedKey) {
					http.Error(w, "User already exists", http.StatusConflict)
				} else {
					http.Error(w, "Failed to create user", http.StatusInternalServerError)
				}
				return
			}
			token, err := lib.GenerateJWT(user.ID.String(), user.UserName)
			if err != nil {
				http.Error(w, "Failed to generate token", http.StatusInternalServerError)
				return
			}
			lib.SetJWTCookie(w, token)
			WriteJSON(w, existingUser)
		}
	})
	http.HandleFunc("/signin", func(w http.ResponseWriter, r *http.Request) {

		if r.Method != "POST" {
			http.Error(w, "404 Not Found", http.StatusNotFound)
			return
		}

		var payload lib.IncomignSigninPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid Input", http.StatusBadRequest)
			return
		}
		// Validate the payload
		err := lib.ValidatePayload(payload)
		if err != nil {
			http.Error(w, "Invalid input: "+err.Error(), http.StatusBadRequest)
			return
		}

		user, err := lib.UserRepositoryInstance.GetUserByEmail(payload.Email)

		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(payload.Password)); err != nil {
			http.Error(w, "Invalid password", http.StatusUnauthorized)
			return
		}
		token, err := lib.GenerateJWT(user.ID.String(), user.UserName)
		if err != nil {
			http.Error(w, "Failed to generate token", http.StatusInternalServerError)
			return
		}
		lib.SetJWTCookie(w, token)
		WriteJSON(w, user)
	})

	http.HandleFunc("/room", AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "404 Not Found", http.StatusNotFound)
			return
		}

		// Debug: Log the context value
		log.Printf("Raw context value: %v", r.Context().Value(userIDKey))

		user, ok := r.Context().Value(userIDKey).(*lib.User)
		if !ok {
			log.Printf("Context type assertion failed")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Debug: Log the user details
		log.Printf("User from context - ID: %s, Username: %s, Email: %s",
			user.ID.String(), user.UserName, user.Email)

		var payload lib.IncomingRoomPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid Input", http.StatusBadRequest)
			return
		}

		err := lib.ValidateBooleanPayload(payload)
		if err != nil {
			http.Error(w, "Invalid input: "+err.Error(), http.StatusBadRequest)
			return
		}

		uuid, err := uuid.NewUUID()
		if err != nil {
			http.Error(w, "UUID can't be generated", http.StatusInternalServerError)
			return
		}

		// Debug: Log what we're about to create
		log.Printf("Creating room with - UUID: %s, UserID: %s, Name: %s",
			uuid.String(), user.ID.String(), payload.Name)

		room, err := lib.ChatRepositoryInstance.CreateRoom(uuid, user.ID, payload.Name, payload.Description, payload.IsPrivate)
		if err != nil {
			log.Printf("Room creation error: %v", err)
			if errors.Is(err, gorm.ErrDuplicatedKey) {
				http.Error(w, "Room already exists", http.StatusConflict)
			} else if errors.Is(err, gorm.ErrForeignKeyViolated) {
				http.Error(w, "Invalid user ID", http.StatusUnprocessableEntity)
			} else {
				http.Error(w, "Server error", http.StatusInternalServerError)
			}
			return
		}

		// Debug: Log the created room
		log.Printf("Room created successfully - ID: %s", room.ID.String())

		w.WriteHeader(http.StatusCreated)
		WriteJSON(w, map[string]interface{}{
			"roomID": room.ID,
		})
	}))

	http.HandleFunc("/room/name", AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {

		if r.Method != "GET" {
			http.Error(w, "404 Not Found", http.StatusNotFound)
			return
		}

		roomName := r.URL.Query().Get("RoomName")
		if roomName == "" {
			http.Error(w, "RoomName parameter is required", http.StatusBadRequest)
			return
		}

		payload := lib.IncomingRoomNamePayload{
			RoomName: roomName,
		}

		err := lib.ValidatePayload(payload)
		if err != nil {
			http.Error(w, "Invalid input: "+err.Error(), http.StatusBadRequest)
			return
		}

		roomID, err := lib.ChatRepositoryInstance.GetRoomID(payload.RoomName)
		if err != nil {
			http.Error(w, "Room Doesnt Exist", http.StatusBadRequest)
			return
		}
		WriteJSONHeader(w, map[string][]lib.ReturnRoomsFormat{
			"roomID": roomID,
		}, http.StatusOK)

	}))
	http.HandleFunc("/room/user", AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "404 Not Found", http.StatusNotFound)
			return
		}

		user, ok := r.Context().Value(userIDKey).(*lib.User)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var payload lib.IncomingRoomJoinPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid Input", http.StatusBadRequest)
			return
		}

		err := lib.ValidatePayload(payload)
		if err != nil {
			http.Error(w, "Invalid input: "+err.Error(), http.StatusBadRequest)
			return
		}

		uuid := payload.RoomID
		userName := payload.UserName

		userID, err := lib.UserRepositoryInstance.GetUserIDByUsername(userName)
		if err != nil {
			http.Error(w, "User doesnt exist with this username", http.StatusBadRequest)
			return
		}

		var Authorized bool = false
		users, err := lib.ChatRepositoryInstance.GetAdminRooms(uuid)
		if err != nil {
			http.Error(w, "Error in  Finding Room ", http.StatusBadRequest)
			return
		}
		for _, user1 := range users {
			if user.ID == user1.ID {
				Authorized = true
			}
		}
		if !Authorized {
			WriteJSONHeader(w, "Unauthorized to add user to room", http.StatusUnauthorized)
			return
		}
		err = lib.ChatRepositoryInstance.AddUserToRoom(userID, uuid, string(lib.Member))

		if err != nil {
			http.Error(w, "Error Adding User To Room", http.StatusInternalServerError)
			return
		}

		WriteJSONHeader(w, "Added User to Room", http.StatusCreated)
	}))

	http.HandleFunc("/room/chats", AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			http.Error(w, "404 Not Found", http.StatusNotFound)
		}

		var roomId string = r.URL.Query().Get("roomID")
		var limit string = r.URL.Query().Get("limit")
		var offset string = r.URL.Query().Get("offset")
		if roomId == "" || limit == "" || offset == "" {
			http.Error(w, "Missing RoomId parameter", http.StatusBadRequest)
			return
		}

		intlimit, err := strconv.Atoi(limit)
		if err != nil {
			fmt.Println("Conversion error:", err)
		} else {
			fmt.Println("Converted int:", intlimit)
		}
		intOffset, err := strconv.Atoi(offset)
		if err != nil {
			fmt.Println("Conversion error:", err)
		} else {
			fmt.Println("Converted int:", intOffset)
		}
		id, err := uuid.Parse(roomId)
		if err != nil {
			http.Error(w, "Invalid UUID format", http.StatusBadRequest)
			return
		}
		user, ok := r.Context().Value(userIDKey).(*lib.User)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		exists, err := lib.ChatRepositoryInstance.IsUserInRoom(user.ID, id)
		if err != nil || !exists {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
		}
		var chats []lib.ReturnMessageFormat
		chats, err = lib.ChatRepositoryInstance.GetRoomMessages(id, intlimit, intOffset)
		fmt.Printf("Chats fetched for room %s is %v \n", roomId, chats)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				WriteJSONHeader(w, "No Messages for this Room", http.StatusNoContent)
			}
		}
		// if chats == nil && err != nil {
		// 	WriteJSON(w, map[string]interface{}{
		// 		"chats": append(chats, lib.ReturnMessageFormat{
		// 			Type: "Joined",
		// 			Content: lib.ContentInfo{
		// 				Message: "Hello from server",
		// 			},
		// 			Timestamp: time.Now(),
		// 			Sender: lib.SenderInfo{
		// 				ID:   "1",
		// 				Name: "Server",
		// 			},
		// 		}),
		// 	})
		// 	return
		// }

		WriteJSON(w, map[string]interface{}{
			"chats": chats,
		})
	}))
	fmt.Println("Server Starting on port 8081")
	http.ListenAndServe(":8081", nil)
}
