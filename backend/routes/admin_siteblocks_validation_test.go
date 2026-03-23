package routes

import "testing"

func TestIsValidSiteBlockName(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  bool
	}{
		{name: "normal name", input: "home", want: true},
		{name: "empty name", input: "", want: false},
		{name: "whitespace only", input: "   ", want: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := isValidSiteBlockName(tc.input); got != tc.want {
				t.Fatalf("isValidSiteBlockName(%q) = %v, want %v", tc.input, got, tc.want)
			}
		})
	}
}
