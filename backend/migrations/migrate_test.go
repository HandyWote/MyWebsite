package migrations

import "testing"

func TestShouldConvertAvatarCroppedInfoToJSONB(t *testing.T) {
	tests := []struct {
		name    string
		colType string
		want    bool
	}{
		{
			name:    "jsonb should not convert",
			colType: "jsonb",
			want:    false,
		},
		{
			name:    "text should convert to jsonb",
			colType: "text",
			want:    true,
		},
		{
			name:    "varchar should convert to jsonb",
			colType: "character varying",
			want:    true,
		},
		{
			name:    "unknown type should not convert",
			colType: "timestamp without time zone",
			want:    false,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			got := shouldConvertAvatarCroppedInfoToJSONB(tt.colType)
			if got != tt.want {
				t.Fatalf("shouldConvertAvatarCroppedInfoToJSONB(%q) = %v, want %v", tt.colType, got, tt.want)
			}
		})
	}
}
