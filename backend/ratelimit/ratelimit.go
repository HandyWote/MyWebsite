// Package ratelimit provides an in-memory failure-counting limiter used to
// throttle password login attempts (P1 plan: 5 failures lock for 15 minutes).
// Keys are caller-supplied, e.g. "IP:username". Single-process only —
// multi-instance deployments would need a shared store.
package ratelimit

import (
	"sync"
	"time"
)

// Clock abstracts the current time so tests can control it.
type Clock interface {
	Now() time.Time
}

type realClock struct{}

func (realClock) Now() time.Time { return time.Now() }

// entry tracks failures for one key within a fixed window.
type entry struct {
	mu          sync.Mutex
	windowStart time.Time
	count       int
}

// Limiter is an in-memory fixed-window failure limiter. A key becomes blocked
// once it accumulates max failures inside one window and stays blocked until
// that window expires. Stale entries are reused on next access and evicted by
// Reset; the map only grows with distinct keys.
type Limiter struct {
	entries sync.Map // key -> *entry
	clock   Clock
	max     int
	window  time.Duration
}

// New creates a Limiter. max <= 0 or window <= 0 disables limiting (all
// attempts allowed). clock is optional; when nil the real clock is used.
func New(max int, window time.Duration, clock Clock) *Limiter {
	if clock == nil {
		clock = realClock{}
	}
	return &Limiter{clock: clock, max: max, window: window}
}

func (l *Limiter) entry(key string) *entry {
	e, _ := l.entries.LoadOrStore(key, &entry{windowStart: l.clock.Now()})
	return e.(*entry)
}

// IsBlocked reports whether key is currently locked out. Always false when
// limiting is disabled or the current window has expired.
func (l *Limiter) IsBlocked(key string) bool {
	if l.max <= 0 || l.window <= 0 {
		return false
	}
	e := l.entry(key)
	e.mu.Lock()
	defer e.mu.Unlock()
	if l.clock.Now().Sub(e.windowStart) >= l.window {
		return false // window expired; next RecordFailure re-arms it
	}
	return e.count >= l.max
}

// RecordFailure counts one failed attempt for key and reports whether the key
// is now blocked (count reached max inside the current window).
func (l *Limiter) RecordFailure(key string) bool {
	if l.max <= 0 || l.window <= 0 {
		return false
	}
	e := l.entry(key)
	e.mu.Lock()
	defer e.mu.Unlock()
	now := l.clock.Now()
	if now.Sub(e.windowStart) >= l.window {
		e.windowStart = now
		e.count = 0
	}
	e.count++
	return e.count >= l.max
}

// Reset clears all tracked state for key, e.g. after a successful login.
func (l *Limiter) Reset(key string) {
	l.entries.Delete(key)
}
