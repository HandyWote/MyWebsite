package routes

import (
	"errors"
	"strings"
	"testing"

	"github.com/handywote/website/models"
)

func TestAvatarZeroValueDoesNotUseEmptyStringForCroppedInfo(t *testing.T) {
	avatar := models.Avatar{
		Filename:  "头像缩略.webp",
		IsCurrent: false,
	}

	if avatar.CroppedInfo != nil {
		t.Fatal("expected cropped_info to default to nil")
	}
}

func TestBuildUploadedAvatarDefaultsToCurrent(t *testing.T) {
	avatar := buildUploadedAvatar("new-avatar.webp")

	if avatar.Filename != "new-avatar.webp" {
		t.Fatalf("expected filename to be new-avatar.webp, got %s", avatar.Filename)
	}

	if !avatar.IsCurrent {
		t.Fatal("expected uploaded avatar to be current by default")
	}
}

func TestCreateThenClearCurrent_DoesNotClearWhenCreateFails(t *testing.T) {
	createErr := errors.New("create failed")
	clearCalled := false

	err := createThenClearCurrent(
		func() error { return createErr },
		func() error {
			clearCalled = true
			return nil
		},
	)

	if !errors.Is(err, createErr) {
		t.Fatalf("expected create error, got %v", err)
	}
	if !strings.Contains(err.Error(), "create avatar") {
		t.Fatalf("expected create context, got %v", err)
	}

	if clearCalled {
		t.Fatal("clear should not be called when create fails")
	}
}

func TestCreateThenClearCurrent_PropagatesClearErrorAfterCreateSuccess(t *testing.T) {
	clearErr := errors.New("clear failed")
	createCalled := false
	clearCalled := false

	err := createThenClearCurrent(
		func() error {
			createCalled = true
			return nil
		},
		func() error {
			clearCalled = true
			return clearErr
		},
	)

	if !createCalled || !clearCalled {
		t.Fatal("expected both create and clear to be called")
	}

	if !errors.Is(err, clearErr) {
		t.Fatalf("expected clear error, got %v", err)
	}
	if !strings.Contains(err.Error(), "clear previous current avatar") {
		t.Fatalf("expected clear context, got %v", err)
	}
}
