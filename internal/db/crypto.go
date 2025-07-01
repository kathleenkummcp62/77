package db

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"os"
)

func getKey() []byte {
	key := os.Getenv("ENC_KEY")
	if key == "" {
		key = "0123456789abcdef0123456789abcdef"
	}
	b := []byte(key)
	if len(b) < 32 {
		pad := make([]byte, 32-len(b))
		b = append(b, pad...)
	}
	if len(b) > 32 {
		b = b[:32]
	}
	return b
}

func encryptString(s string) (string, error) {
	key := getKey()
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	ciphertext := gcm.Seal(nonce, nonce, []byte(s), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func decryptString(s string) (string, error) {
	key := getKey()
	data, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(data) < gcm.NonceSize() {
		return "", fmt.Errorf("ciphertext too short")
	}
	nonce := data[:gcm.NonceSize()]
	ciphertext := data[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}
