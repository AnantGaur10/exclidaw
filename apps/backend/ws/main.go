package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"backend/lib"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// A flexible payload for broadcasting different types of messages
type BroadcastPayload struct {
	Type    lib.MessageType
	Message *UserMessage
}

type UserMessage struct {
	UserID   string
	UserName string
	Message  map[string]interface{}
}

type ConnectionState int

const (
	StateConnected ConnectionState = iota
	StateJoined
)

type User struct {
	ID       uuid.UUID       `json:"id"`
	UserName string          `json:"username"`
	Conn     *websocket.Conn `json:"-"`
	Send     chan []byte     `json:"-"`
	State    ConnectionState `json:"-"`
	RoomID   *uuid.UUID      `json:"-"`
	mu       sync.RWMutex    `json:"-"`
}

type Room struct {
	ID         uuid.UUID
	Users      map[uuid.UUID]*User
	BroadCast  chan *BroadcastPayload // Use the new flexible payload
	Register   chan *User
	Unregister chan *User
	mu         sync.RWMutex
}

func NewRoom(ID uuid.UUID) RoomInterface {
	return &Room{
		ID:         ID,
		Users:      make(map[uuid.UUID]*User),
		BroadCast:  make(chan *BroadcastPayload, 100),
		Register:   make(chan *User, 10),
		Unregister: make(chan *User, 10),
		mu:         sync.RWMutex{},
	}
}

type RoomInterface interface {
	Run()
	broadcastMessage(*BroadcastPayload)
	logChannelStats()
	RegisterUser(*User)
	UnregisterUser(*User)
	BroadCastMessageChannel() chan *BroadcastPayload
	GetRoomID() uuid.UUID
	GetRWMutex() *sync.RWMutex
	GetUsersN() int
}

func (r *Room) Run() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case user := <-r.Register:
			r.mu.Lock()
			r.Users[user.ID] = user
			r.mu.Unlock()
			log.Printf("User %s (%s) joined room %s", user.ID, user.UserName, r.ID)

		case user := <-r.Unregister:
			r.mu.Lock()
			if _, ok := r.Users[user.ID]; ok {
				log.Printf("User %s (%s) left room %s", user.ID, user.UserName, r.ID)
				delete(r.Users, user.ID)

				leftMessage := &UserMessage{
					UserID:   user.ID.String(),
					UserName: user.UserName,
					Message:  map[string]interface{}{"userID": user.ID.String()},
				}
				go r.broadcastMessage(&BroadcastPayload{
					Type:    lib.MessageTypeUserLeft,
					Message: leftMessage,
				})

			}
			r.mu.Unlock()

		case payload := <-r.BroadCast:
			r.broadcastMessage(payload)

		case <-ticker.C:
			r.logChannelStats()
		}
	}
}

func (r *Room) broadcastMessage(payload *BroadcastPayload) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	userMsg := payload.Message

	broadcastData, err := json.Marshal(map[string]interface{}{
		"Type": payload.Type, // Use the type from the payload (e.g., "draw", "chat", "undo")
		"sender": map[string]string{
			"id":   userMsg.UserID,
			"name": userMsg.UserName,
		},
		"content":   userMsg.Message, // This is the shape, chat content, or undo info
		"timestamp": time.Now().Unix(),
	})
	if err != nil {
		log.Printf("Error marshaling broadcast message: %v", err)
		return
	}

	log.Printf("Broadcasting '%s' message from %s to %d users in room %s", payload.Type, userMsg.UserName, len(r.Users)-1, r.ID)

	for userID, user := range r.Users {
		// Don't send the message back to the original sender for actions they initiated
		if user.ID.String() == userMsg.UserID && payload.Type != lib.MessageTypeUserLeft {
			continue
		}

		select {
		case user.Send <- broadcastData:
		default:
			log.Printf("Removing slow user %s from room %s", userID, r.ID)
			delete(r.Users, userID)
			close(user.Send)
		}
	}
}

func (r *Room) logChannelStats() {
	r.mu.RLock()
	userCount := len(r.Users)
	r.mu.RUnlock()

	log.Printf("Room %s - Users: %d, Broadcast queue: %d/%d, Register queue: %d/%d, Unregister queue: %d/%d",
		r.ID,
		userCount,
		len(r.BroadCast), cap(r.BroadCast),
		len(r.Register), cap(r.Register),
		len(r.Unregister), cap(r.Unregister))
}

func (r *Room) RegisterUser(user *User) {
	select {
	case r.Register <- user:
	default:
		log.Printf("Register channel full for room %s", r.ID)
	}
}

func (r *Room) UnregisterUser(user *User) {
	select {
	case r.Unregister <- user:
	default:
		log.Printf("Unregister channel full for room %s", r.ID)
	}
}

func (r *Room) BroadCastMessageChannel() chan *BroadcastPayload {
	return r.BroadCast
}

func (r *Room) GetRoomID() uuid.UUID {
	return r.ID
}

func (r *Room) GetRWMutex() *sync.RWMutex {
	return &r.mu
}

func (r *Room) GetUsersN() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.Users)
}

type ChatServer struct {
	Rooms map[uuid.UUID]RoomInterface
	mu    sync.RWMutex
}

func NewChatServer() *ChatServer {
	return &ChatServer{
		Rooms: make(map[uuid.UUID]RoomInterface),
		mu:    sync.RWMutex{},
	}
}

type ChatServerInterface interface {
	handleConnection(userID uuid.UUID, conn *websocket.Conn)
	readPump(user *User)
	handleMessage(user *User, msgBytes []byte)
	writePump(user *User)
	GetRoom(roomID uuid.UUID) RoomInterface
	Cleanup()
}

func (cs *ChatServer) handleConnection(userID uuid.UUID, userName string, conn *websocket.Conn) {
	user := &User{
		ID:       userID,
		UserName: userName,
		Conn:     conn,
		Send:     make(chan []byte, 256),
		State:    StateConnected,
		RoomID:   nil,
	}

	log.Printf("New connection established for user %s (%s)", user.ID, user.UserName)

	defer func() {
		log.Printf("Connection closing for user %s (%s)", user.ID, user.UserName)
		if user.RoomID != nil {
			cs.mu.RLock()
			if room, exists := cs.Rooms[*user.RoomID]; exists {
				room.UnregisterUser(user)
			}
			cs.mu.RUnlock()
		}
		conn.Close()
	}()

	go cs.writePump(user)
	cs.readPump(user)
}

func (cs *ChatServer) readPump(user *User) {
	defer func() {
		log.Printf("ReadPump closing for user %s", user.ID)
		if user.RoomID != nil {
			cs.mu.RLock()
			if room, exists := cs.Rooms[*user.RoomID]; exists {
				room.UnregisterUser(user)
			}
			cs.mu.RUnlock()
		}
		user.Conn.Close()
	}()

	user.Conn.SetReadLimit(maxMessageSize)
	user.Conn.SetReadDeadline(time.Now().Add(pongWait))
	user.Conn.SetPongHandler(func(string) error {
		user.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, messageBytes, err := user.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Websocket error for user %s: %v", user.ID, err)
			}
			break
		}

		user.Conn.SetReadDeadline(time.Now().Add(pongWait))
		cs.handleMessage(user, messageBytes)
	}
}

func (cs *ChatServer) handleMessage(user *User, msgBytes []byte) {
	var msg EnhancedMessage
	if err := json.Unmarshal(msgBytes, &msg); err != nil {
		log.Printf("Error unmarshaling message from user %s: %v", user.ID, err)
		cs.sendErrorToUser(user, "Invalid message format")
		return
	}

	log.Printf("User %s in state %v sent '%s' message", user.ID, user.State, msg.Type)

	user.mu.RLock()
	currentState := user.State
	user.mu.RUnlock()

	switch currentState {
	case StateConnected:
		cs.handlePreJoinMessage(user, &msg)
	case StateJoined:
		cs.handlePostJoinMessage(user, &msg)
	}
}

func (cs *ChatServer) handlePreJoinMessage(user *User, msg *EnhancedMessage) {
	switch msg.Type {
	case lib.MessageTypeJoin:
		cs.handleJoinRoom(user, msg)
	case lib.MessageTypePing:
		cs.sendPongToUser(user)
	default:
		cs.sendErrorToUser(user, "Must join a room first")
	}
}

func (cs *ChatServer) handlePostJoinMessage(user *User, msg *EnhancedMessage) {
	switch msg.Type {
	case lib.MessageTypePing:
		cs.sendPongToUser(user)
	case lib.MessageTypeChat:
		cs.handleChatMessage(user, msg)
	case lib.MessageTypeDraw:
		cs.handleDrawMessage(user, msg)
	case lib.MessageTypePencilChunk:
		cs.handlePencilChunkMessage(user, msg)
	case lib.MessageTypeUndo:
		cs.handleUndoMessage(user, msg)
	case lib.MessageTypeErase:
		cs.handleEraseMessage(user, msg)
	case lib.MessageTypeJoin:
		cs.sendErrorToUser(user, "Already joined a room")
	case lib.MessageTypeUserLeft:
		cs.handleLeaveRoom(user, msg)
	case lib.MessageTypeCursorMove:
		cs.handleCursorMoveMessage(user, msg)
	default:
		log.Printf("Unknown message type '%s' from user %s", msg.Type, user.ID)
	}
}

func (cs *ChatServer) handleJoinRoom(user *User, msg *EnhancedMessage) {
	roomIDInterface, exists := msg.Message["roomID"]
	if !exists {
		cs.sendErrorToUser(user, "Room ID is required for join message")
		return
	}
	roomIDStr, ok := roomIDInterface.(string)
	if !ok {
		cs.sendErrorToUser(user, "Room ID must be a string")
		return
	}
	roomID, err := uuid.Parse(roomIDStr)
	if err != nil {
		cs.sendErrorToUser(user, "Invalid Room ID format")
		return
	}

	log.Printf("User %s attempting to join room %s", user.ID, roomID)

	isUserInRoom, err := lib.ChatRepositoryInstance.IsUserInRoom(user.ID, roomID)
	if err != nil || !isUserInRoom {
		log.Printf("Unauthorized join attempt by user %s to room %s", user.ID, roomID)
		cs.sendErrorToUser(user, "You are not authorized to join this room.")
		user.Conn.Close()
		return
	}

	user.mu.Lock()
	user.State = StateJoined
	user.RoomID = &roomID
	user.mu.Unlock()

	room := cs.GetRoom(roomID)
	room.RegisterUser(user)

	// Fetch and send existing shapes in a separate goroutine
	go func() {
		shapes, err := lib.ShapeRepositoryInstance.GetShapesByRoomID(roomID)
		if err != nil {
			log.Printf("Error fetching shapes for room %s: %v", roomID, err)
			cs.sendErrorToUser(user, "Could not load canvas history.")
			return
		}

		// The user object sent back should be minimal, only what the client needs
		// to identify itself.
		joiningUser := map[string]interface{}{
			"userID": user.ID.String(),
			"name":   user.UserName,
		}

		initialStateMsg := map[string]interface{}{
			"Type": "initial_state",
			"content": map[string]interface{}{
				"shapes": shapes,
				"user":   joiningUser,
			},
		}
		cs.sendMessageToUser(user, initialStateMsg)
		log.Printf("Sent %d existing shapes and user info to user %s for room %s", len(shapes), user.ID, roomID)
	}()
}

func (cs *ChatServer) handleEraseMessage(user *User, msg *EnhancedMessage) {
	user.mu.RLock()
	roomID := user.RoomID
	user.mu.RUnlock()
	if roomID == nil {
		cs.sendErrorToUser(user, "Cannot erase, not in a room")
		return
	}

	cs.mu.RLock()
	room, exists := cs.Rooms[*roomID]
	cs.mu.RUnlock()
	if !exists {
		cs.sendErrorToUser(user, "Room no longer exists")
		return
	}

	shapeIDInterface, ok := msg.Message["shapeID"]
	if !ok {
		cs.sendErrorToUser(user, "shapeID is required for erase message")
		return
	}
	shapeIDStr, ok := shapeIDInterface.(string)
	if !ok {
		cs.sendErrorToUser(user, "shapeID must be a string")
		return
	}

	shapeID, err := uuid.Parse(shapeIDStr)
	if err != nil {
		cs.sendErrorToUser(user, "Invalid Shape ID format for erase")
		return
	}

	// Delete the shape from the database
	if err := lib.ShapeRepositoryInstance.DeleteShape(shapeID); err != nil {
		log.Printf("Failed to delete shape %s for erase: %v", shapeID, err)
		// Don't send an error to the user, as the shape might have already been deleted.
		// The client already performed the action optimistically.
		return
	}

	// Broadcast the erase action to the room so other clients can remove the shape
	userMessage := &UserMessage{
		UserID:   user.ID.String(),
		UserName: user.UserName,
		Message: map[string]interface{}{
			"shapeID": shapeID.String(),
		},
	}

	room.BroadCastMessageChannel() <- &BroadcastPayload{
		Type:    lib.MessageTypeErase, // Use the new type
		Message: userMessage,
	}
}

func (cs *ChatServer) handleChatMessage(user *User, msg *EnhancedMessage) {
	user.mu.RLock()
	roomID := user.RoomID
	user.mu.RUnlock()
	if roomID == nil {
		cs.sendErrorToUser(user, "Not in a room")
		return
	}
	cs.mu.RLock()
	room, exists := cs.Rooms[*roomID]
	cs.mu.RUnlock()
	if !exists {
		cs.sendErrorToUser(user, "Room no longer exists")
		return
	}

	err := lib.ChatRepositoryInstance.CreateMessage(&lib.Message{
		Type:    msg.Type,
		UserID:  user.ID,
		RoomID:  *user.RoomID,
		Content: fmt.Sprintf("%v", msg.Message),
	})
	if err != nil {
		log.Printf("Failed to persist chat message: %v", err)
	}

	userMessage := &UserMessage{
		UserID:   user.ID.String(),
		UserName: user.UserName,
		Message:  msg.Message,
	}

	room.BroadCastMessageChannel() <- &BroadcastPayload{
		Type:    lib.MessageTypeChat,
		Message: userMessage,
	}
}

func (cs *ChatServer) handleDrawMessage(user *User, msg *EnhancedMessage) {
	user.mu.RLock()
	roomID := user.RoomID
	user.mu.RUnlock()
	if roomID == nil {
		cs.sendErrorToUser(user, "Cannot draw, not in a room")
		return
	}
	cs.mu.RLock()
	room, exists := cs.Rooms[*roomID]
	cs.mu.RUnlock()
	if !exists {
		cs.sendErrorToUser(user, "Room no longer exists")
		return
	}

	jsonBytes, err := json.Marshal(msg.Message)
	if err != nil {
		log.Printf("Error re-marshaling shape data from message: %v", err)
		return
	}

	var shape lib.Shape
	if err := json.Unmarshal(jsonBytes, &shape); err != nil {
		log.Printf("Error unmarshaling shape data from message: %v", err)
		cs.sendErrorToUser(user, "Invalid shape data format")
		return
	}

	// The client sends a temporary UUID. We parse it and use it for the DB record.
	idStr, ok := msg.Message["id"].(string)
	if !ok {
		cs.sendErrorToUser(user, "Shape ID is missing or not a string")
		return
	}
	shapeID, err := uuid.Parse(idStr)
	if err != nil {
		cs.sendErrorToUser(user, "Invalid Shape ID format")
		return
	}
	shape.ID = shapeID

	shape.RoomID = *roomID
	shape.CreatorID = user.ID

	if err := lib.ShapeRepositoryInstance.CreateShape(&shape); err != nil {
		log.Printf("Failed to persist shape: %v", err)
		cs.sendErrorToUser(user, "Could not save your drawing.")
		return
	}

	// The message to broadcast is the original message content from the client.
	// This ensures the ID matches what the client optimistically created.
	userMessage := &UserMessage{
		UserID:   user.ID.String(),
		UserName: user.UserName,
		Message:  msg.Message,
	}

	room.BroadCastMessageChannel() <- &BroadcastPayload{
		Type:    lib.MessageTypeDraw,
		Message: userMessage,
	}
}

// highlight-start
// handlePencilChunkMessage just broadcasts the chunk to other users without DB persistence.
// The full shape is persisted by handleDrawMessage when the drawing is complete.
func (cs *ChatServer) handlePencilChunkMessage(user *User, msg *EnhancedMessage) {
	user.mu.RLock()
	roomID := user.RoomID
	user.mu.RUnlock()

	if roomID == nil {
		// Silently ignore if not in a room, to avoid log spam
		return
	}

	cs.mu.RLock()
	room, exists := cs.Rooms[*roomID]
	cs.mu.RUnlock()
	if !exists {
		return
	}

	// Broadcast the pencil chunk to other users in the room
	userMessage := &UserMessage{
		UserID:   user.ID.String(),
		UserName: user.UserName,
		Message:  msg.Message,
	}

	room.BroadCastMessageChannel() <- &BroadcastPayload{
		Type:    lib.MessageTypePencilChunk,
		Message: userMessage,
	}
}

func (cs *ChatServer) handleUndoMessage(user *User, msg *EnhancedMessage) {
	user.mu.RLock()
	roomID := user.RoomID
	user.mu.RUnlock()
	if roomID == nil {
		cs.sendErrorToUser(user, "Cannot undo, not in a room")
		return
	}

	cs.mu.RLock()
	room, exists := cs.Rooms[*roomID]
	cs.mu.RUnlock()
	if !exists {
		cs.sendErrorToUser(user, "Room no longer exists")
		return
	}

	// The client should send a message like: { "shapeID": "uuid-string-here" }
	shapeIDInterface, ok := msg.Message["shapeID"]
	if !ok {
		cs.sendErrorToUser(user, "shapeID is required for undo message")
		return
	}
	shapeIDStr, ok := shapeIDInterface.(string)
	if !ok {
		cs.sendErrorToUser(user, "shapeID must be a string")
		return
	}

	shapeID, err := uuid.Parse(shapeIDStr)
	if err != nil {
		cs.sendErrorToUser(user, "Invalid Shape ID format")
		return
	}

	// Delete the shape from the database
	if err := lib.ShapeRepositoryInstance.DeleteShape(shapeID); err != nil {
		log.Printf("Failed to delete shape %s: %v", shapeID, err)
		cs.sendErrorToUser(user, "Could not perform undo operation.")
		return
	}

	// Broadcast the undo action to the room so other clients can remove the shape
	userMessage := &UserMessage{
		UserID:   user.ID.String(),
		UserName: user.UserName,
		Message: map[string]interface{}{
			"shapeID": shapeID.String(), // Send back the confirmed ID
		},
	}

	room.BroadCastMessageChannel() <- &BroadcastPayload{
		Type:    lib.MessageTypeUndo,
		Message: userMessage,
	}
}

// highlight-end

func (cs *ChatServer) handleLeaveRoom(user *User, msg *EnhancedMessage) {
	roomIDInterface, exists := msg.Message["roomID"]
	if !exists {
		cs.sendErrorToUser(user, "Room ID is required")
		return
	}

	roomIDStr, ok := roomIDInterface.(string)
	if !ok {
		cs.sendErrorToUser(user, "Room ID must be a string")
		return
	}

	roomID, err := uuid.Parse(roomIDStr)
	if err != nil {
		cs.sendErrorToUser(user, "Invalid Room ID format")
		return
	}

	cs.mu.RLock()
	room, exists := cs.Rooms[roomID]
	cs.mu.RUnlock()
	if !exists {
		cs.sendErrorToUser(user, fmt.Sprintf("No room with room ID %s", roomID))
		return
	}

	log.Printf("User %s attempting to leave room %s", user.ID, roomID)

	// Update user state
	user.mu.Lock()
	user.State = StateConnected
	user.RoomID = nil
	user.mu.Unlock()

	// Unregister user with room
	room.UnregisterUser(user)
}

func (cs *ChatServer) handleCursorMoveMessage(user *User, msg *EnhancedMessage) {
	user.mu.RLock()
	roomID := user.RoomID
	user.mu.RUnlock()

	if roomID == nil {
		return // Silently ignore if not in a room
	}

	cs.mu.RLock()
	room, exists := cs.Rooms[*roomID]
	cs.mu.RUnlock()
	if !exists {
		return // Silently ignore if room is gone
	}

	// Just broadcast the coordinates. No DB persistence.
	userMessage := &UserMessage{
		UserID:   user.ID.String(),
		UserName: user.UserName,
		Message:  msg.Message,
	}

	room.BroadCastMessageChannel() <- &BroadcastPayload{
		Type:    lib.MessageTypeCursorMove,
		Message: userMessage,
	}
}

func (cs *ChatServer) sendPongToUser(user *User) {
	pongMsg := map[string]interface{}{"type": "pong"}
	cs.sendMessageToUser(user, pongMsg)
}

func (cs *ChatServer) sendErrorToUser(user *User, errorMsg string) {
	errMsg := map[string]interface{}{
		"Type": "error",
		"content": map[string]string{
			"error": errorMsg,
		},
	}
	cs.sendMessageToUser(user, errMsg)
}

func (cs *ChatServer) sendMessageToUser(user *User, message map[string]interface{}) {
	msgBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling direct message for user %s: %v", user.ID, err)
		return
	}
	select {
	case user.Send <- msgBytes:
	default:
		log.Printf("Could not send direct message to user %s - send channel full", user.ID)
	}
}

func (cs *ChatServer) writePump(user *User) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		user.Conn.Close()
		log.Printf("WritePump closed for user %s", user.ID)
	}()
	for {
		select {
		case message, ok := <-user.Send:
			user.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				user.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := user.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("Error writing message to user %s: %v", user.ID, err)
				return
			}
		case <-ticker.C:
			user.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := user.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("Error sending ping to user %s: %v", user.ID, err)
				return
			}
		}
	}
}

func (cs *ChatServer) GetRoom(roomID uuid.UUID) RoomInterface {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	room, exists := cs.Rooms[roomID]
	if !exists {
		log.Printf("Creating new room %s", roomID)
		room = NewRoom(roomID)
		cs.Rooms[roomID] = room
		go room.Run()
	}
	return room
}

func (cs *ChatServer) Cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		cs.mu.Lock()
		emptyRooms := []uuid.UUID{}

		for id, room := range cs.Rooms {
			if room.GetUsersN() == 0 {
				emptyRooms = append(emptyRooms, id)
			}
		}

		for _, id := range emptyRooms {
			delete(cs.Rooms, id)
			log.Printf("Cleaned up empty room %s", id)
		}

		if len(emptyRooms) > 0 {
			log.Printf("Cleanup completed: removed %d empty rooms, %d rooms remaining",
				len(emptyRooms), len(cs.Rooms))
		}
		cs.mu.Unlock()
	}
}

type CustomClaims struct {
	UserID   string `json:"user_id"`
	UserName string `json:"user_name"`
	jwt.RegisteredClaims
}

func VerifyJWT(tokenString string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok {
		return nil, fmt.Errorf("could not parse claims")
	}

	return claims, nil
}

var (
	upgrader = websocket.Upgrader{
		ReadBufferSize:  2048 * 100,
		WriteBufferSize: 2048 * 100,
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
	jwtSecret  = []byte("BabluBhaiSuperSecretKey")
	chatServer = NewChatServer()
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512000 // Increased significantly for large canvas state
)

type EnhancedMessage struct {
	Type    lib.MessageType        `json:"Type"` // Ensure this matches client casing
	Message map[string]interface{} `json:"Message"`
}

func main() {
	fmt.Println("WebSocket Chat & Canvas Server Starting")
	go chatServer.Cleanup()
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("token")
		if err != nil {
			http.Error(w, "Unauthorized: No Token Cookie", http.StatusUnauthorized)
			return
		}
		claims, err := VerifyJWT(cookie.Value)
		if err != nil {
			http.Error(w, "Unauthorized: Invalid Token", http.StatusUnauthorized)
			return
		}
		userID, err := uuid.Parse(claims.UserID)
		if err != nil {
			http.Error(w, "Invalid User ID in token", http.StatusBadRequest)
			return
		}
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("WebSocket upgrade error: %v", err)
			return
		}
		chatServer.handleConnection(userID, claims.UserName, conn)
	})
	log.Println("WebSocket backend started on port 8082")
	if err := http.ListenAndServe(":8082", nil); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
