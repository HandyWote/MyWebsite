package routes

import (
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
