package lib

import (
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	Db                      *gorm.DB
	UserRepositoryInstance  *UserRepository
	ChatRepositoryInstance  *ChatRepository
	// highlight-start
	ShapeRepositoryInstance *ShapeRepository
	// highlight-end
)

type UserRepository struct {
	db *gorm.DB
}

type UserRepositoryInterface interface {
	CreateUser(user *User) error
	GetUserByEmail(email string) (*User, error)
	GetUserById(id string) (*User, error)
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (u *UserRepository) GetUserByEmail(email string) (*User, error) {
	var user User
	result := u.db.Where("email = ?", email).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			log.Printf("User Not found for email %s with error %v :", email, result.Error)
			return nil, result.Error
		}
		log.Printf("Database error while fetching user %s: %v", email, result.Error)
		return nil, fmt.Errorf("failed to fetch user: %w", result.Error)
	}
	return &user, nil
}

// GetUserIDByUsername retrieves a user ID by username
func (u *UserRepository) GetUserIDByUsername(username string) (uuid.UUID, error) {
	var user User
	result := u.db.Select("id").Where("user_name = ?", username).First(&user)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return uuid.Nil, fmt.Errorf("user with username %s not found", username)
		}
		return uuid.Nil, fmt.Errorf("failed to fetch user ID: %w", result.Error)
	}

	return user.ID, nil
}

func (u *UserRepository) CreateUser(user *User) (*User, error) {
	if user == nil {
		return nil, fmt.Errorf("user cannot be nil")
	}

	// 1. Check if email exists
	_, err := u.GetUserByEmail(user.Email)
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			// Real database error - return error
			return nil, fmt.Errorf("failed to check existing user by email: %w", err)
		}
		// Email doesn't exist - continue to username check
	} else {
		// Email exists
		return nil, fmt.Errorf("user with email %s already exists", user.Email)
	}

	// 2. Check if username exists
	var existingUser User
	result := u.db.Where("user_name = ?", user.UserName).First(&existingUser)
	if result.Error != nil {
		if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
			// Real database error - return error
			return nil, fmt.Errorf("failed to check existing user by username: %w", result.Error)
		}
		// Username doesn't exist - continue to create
	} else {
		// Username exists
		return nil, fmt.Errorf("username %s is already taken", user.UserName)
	}

	// 3. Create the user (only reached if both email and username don't exist)
	result = u.db.Create(user)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to create user: %w", result.Error)
	}

	return user, nil
}

func (u *UserRepository) GetUserByName(id string) (*User, error) {
	var user User
	result := u.db.First(&user, "user_name = ?", id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			log.Printf("User with ID %s not found", id)
			return nil, fmt.Errorf("user with ID %s not found", id)
		}
		log.Printf("Database Error while fetching the User %s : %v\n", id, result.Error)
		return nil, fmt.Errorf("failed to fetch User %w :", result.Error)
	}
	return &user, nil
}

type ChatRepository struct {
	db *gorm.DB
}

func NewChatRepository(db *gorm.DB) *ChatRepository {
	return &ChatRepository{db: db}
}

func (r *ChatRepository) CreateRoom(roomID, userId uuid.UUID, name string, description string, isPrivate bool) (*Room, error) {
	var room *Room = &Room{
		ID:          roomID,
		Name:        name,
		Description: description,
		IsPrivate:   isPrivate,
		CreatorID:   userId,
	}
	result := r.db.Create(room)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to create Room with id %v by user %v due to:%v", roomID, userId, result.Error)
	}

	res := r.db.Create(&UserRoom{
		UserID: userId,
		RoomID: roomID,
		Role:   string(Creator),
	})
	if res.Error != nil {
		return nil, fmt.Errorf("failed to create Room with id %v by user %v due to:%v", roomID, userId, res.Error)
	}
	return room, nil
}

func (r *ChatRepository) GetRoomByID(id uuid.UUID) (*Room, error) {
	var room Room
	err := r.db.Preload("Creator").Preload("Users").Preload("Messages.User").First(&room, id).Error
	return &room, err
}

func (r *ChatRepository) GetRoomID(RoomName string) ([]ReturnRoomsFormat, error) {
	var res []ReturnRoomsFormat
	if RoomName == "" {
		return res, fmt.Errorf("Room Name is nil")
	}
	var rooms []Room
	result := r.db.Preload("Creator").Where("name = ?", RoomName).Find(&rooms)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return res, fmt.Errorf("room with name '%s' not found", RoomName)
		}
		return res, fmt.Errorf("failed to fetch room ID: %w", result.Error)
	}
	for _, room := range rooms {
		res = append(res, ReturnRoomsFormat{
			RoomName: room.Name,
			RoomID:   room.ID,
			UserName: room.Creator.UserName,
		})
	}
	return res, nil
}

func (r *ChatRepository) GetUserRooms(userID uuid.UUID) ([]Room, error) {
	var user User
	err := r.db.Preload("Rooms.Creator").First(&user, userID).Error
	return user.Rooms, err
}

func (r *ChatRepository) GetAdminRooms(roomID uuid.UUID) ([]User, error) {
	// Get explicit admins from user_rooms
	var userRooms []UserRoom
	if err := r.db.Preload("User").
		Where("room_id = ? AND role = ?", roomID, "admin").
		Find(&userRooms).Error; err != nil {
		return nil, err
	}

	// Get the room creator
	var room Room
	if err := r.db.Preload("Creator").First(&room, roomID).Error; err != nil {
		return nil, err
	}

	// Combine both (avoid duplicates)
	admins := make([]User, 0)
	admins = append(admins, room.Creator) // Creator is always an admin
	for _, ur := range userRooms {
		if ur.UserID != room.CreatorID { // Avoid duplicate if creator was also in user_rooms
			admins = append(admins, ur.User)
		}
	}

	return admins, nil
}

func (r *ChatRepository) AddUserToRoom(userID, roomID uuid.UUID, role string) error {
	userRoom := UserRoom{
		UserID: userID,
		RoomID: roomID,
		Role:   role,
	}
	return r.db.Create(&userRoom).Error
}

func (r *ChatRepository) RemoveUserFromRoom(userID, roomID uuid.UUID) error {
	return r.db.Where("user_id = ? AND room_id = ?", userID, roomID).Delete(&UserRoom{}).Error
}

// Message operations
func (r *ChatRepository) CreateMessage(message *Message) error {
	return r.db.Create(message).Error
}

func (r *ChatRepository) GetRoomMessages(roomID uuid.UUID, limit int, offset int) ([]ReturnMessageFormat, error) {
	var messages []Message
	err := r.db.Preload("User").Where("room_id = ?", roomID).
		Order("created_at DESC").Limit(limit).Offset(offset).Find(&messages).Error
	if err != nil {
		return nil, err
	}
	var returnMessages []ReturnMessageFormat = make([]ReturnMessageFormat, len(messages))
	if len(messages) > 0 {
		for index, message := range messages {
			_,after,_ := strings.Cut(message.Content, "map[Message:")
			after = after[0 : len(after)-1]
			returnMessages[index] = ReturnMessageFormat{
				Type:      string(message.Type),
				Timestamp: message.UpdatedAt,
				Sender: SenderInfo{
					ID:   message.User.ID.String(),
					Name: message.User.UserName,
				},

				Content: ContentInfo{
					Message: after,
				},
			}
		}
	}
	return returnMessages, nil
}

func (r *ChatRepository) GetLatestMessages(roomID uuid.UUID, limit int) ([]Message, error) {
	var messages []Message
	err := r.db.Preload("User").Where("room_id = ?", roomID).
		Order("created_at ASC").Limit(limit).Find(&messages).Error

	return messages, err
}

// Check if user is in room
func (r *ChatRepository) IsUserInRoom(userID, roomID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&UserRoom{}).Where("user_id = ? AND room_id = ?", userID, roomID).Count(&count).Error
	return count > 0, err
}

// Get room members
func (r *ChatRepository) GetRoomMembers(roomID uuid.UUID) ([]User, error) {
	var room Room
	err := r.db.Preload("Users").First(&room, roomID).Error
	return room.Users, err
}

type ShapeRepositoryInterface interface {
	CreateShape(shape *Shape) error
	GetShapesByRoomID(roomID uuid.UUID) ([]Shape, error)
	UpdateShape(shape *Shape) error
	DeleteShape(shapeID uuid.UUID) error
	DeleteShapesByRoomID(roomID uuid.UUID) error // For clearing the canvas
}

type ShapeRepository struct {
	db *gorm.DB
}

func NewShapeRepository(db *gorm.DB) *ShapeRepository {
	return &ShapeRepository{db: db}
}

// CreateShape adds a new shape to the database.
// This is called when a user finishes drawing a new shape.
func (s *ShapeRepository) CreateShape(shape *Shape) error {
	result := s.db.Create(shape)
	if result.Error != nil {
		return fmt.Errorf("failed to create shape: %w", result.Error)
	}
	return nil
}

// GetShapesByRoomID retrieves all shapes associated with a specific room.
// This is called when a user first joins a room to load the canvas.
func (s *ShapeRepository) GetShapesByRoomID(roomID uuid.UUID) ([]Shape, error) {
	var shapes []Shape
	result := s.db.Preload("Creator").Where("room_id = ?", roomID).Order("created_at ASC").Find(&shapes)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to get shapes for room %s: %w", roomID, result.Error)
	}
	return shapes, nil
}

// UpdateShape updates an existing shape in the database.
// This is used for moving, resizing, or changing the color of a shape.
// The provided shape struct should have its ID field populated.
func (s *ShapeRepository) UpdateShape(shape *Shape) error {
	if shape.ID == uuid.Nil {
		return errors.New("cannot update shape without an ID")
	}

	// Use Save to update all fields of the model based on its primary key.
	// This is robust for updating any property (position, size, color, points, etc.).
	result := s.db.Save(shape)
	if result.Error != nil {
		return fmt.Errorf("failed to update shape %s: %w", shape.ID, result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("shape with ID %s not found for update", shape.ID)
	}
	return nil
}

// DeleteShape removes a single shape from the database by its ID.
// This is called when a user selects and deletes a shape.
func (s *ShapeRepository) DeleteShape(shapeID uuid.UUID) error {
	log.Printf("Shaped id received to delete is %s",shapeID.String())
	if shapeID == uuid.Nil {
		return errors.New("cannot delete shape without an ID")
	}
	result := s.db.Where("id = ?", shapeID).Delete(&Shape{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete shape %s: %w", shapeID, result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("shape with ID %s not found for deletion", shapeID)
	}
	return nil
}

// DeleteShapesByRoomID removes all shapes from a specific room.
// This is useful for a "Clear Canvas" feature.
func (s *ShapeRepository) DeleteShapesByRoomID(roomID uuid.UUID) error {
	if roomID == uuid.Nil {
		return errors.New("cannot delete shapes without a room ID")
	}
	// Note: This won't return an error if 0 rows are affected (i.e., the canvas was already empty).
	result := s.db.Where("room_id = ?", roomID).Delete(&Shape{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete all shapes for room %s: %w", roomID, result.Error)
	}
	return nil
}

func init() {
	var err error
	dsn := "host=postgres user=anant password=supersecret dbname=mydb port=5432 sslmode=disable"

	// Add retry logic for database connection
	var db *gorm.DB
	for i := 0; i < 10; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err == nil {
			break
		}
		log.Println("Failed to connect to DB, retrying...")
		time.Sleep(5 * time.Second)
	}

	if err != nil {
		log.Fatal("Failed to connect to database after retries:", err)
	}

	// Enable SQL logging
	db.Logger = logger.Default.LogMode(logger.Info)

	// Migrate with error checking
	err = db.AutoMigrate(&User{}, &Room{}, &Message{}, &UserRoom{}, &Shape{})
	if err != nil {
		log.Fatal("Failed to auto-migrate tables:", err)
	}

	// Verify tables exist
	if !db.Migrator().HasTable(&Message{}) {
		log.Fatal("Messages table was not created")
	}
	if !db.Migrator().HasTable(&UserRoom{}) {
		log.Fatal("UserRooms table was not created")
	}
	if !db.Migrator().HasTable(&Shape{}) {
		log.Fatal("Shapes table was not created")
	}

	Db = db
	UserRepositoryInstance = NewUserRepository(Db)
	ChatRepositoryInstance = NewChatRepository(Db)
	// highlight-start
	ShapeRepositoryInstance = NewShapeRepository(Db)
	// highlight-end

	fmt.Println("Database initialized successfully!")
}