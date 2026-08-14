package ratelimit

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

type fakeClock struct {
	now time.Time
}

func (c *fakeClock) Now() time.Time { return c.now }

func (c *fakeClock) advance(d time.Duration) { c.now = c.now.Add(d) }

func newFakeClock() *fakeClock {
	return &fakeClock{now: time.Date(2026, 8, 13, 12, 0, 0, 0, time.UTC)}
}

func TestLimiterBlocksAfterMaxFailures(t *testing.T) {
	clock := newFakeClock()
	l := New(5, 15*time.Minute, clock)

	key := "203.0.113.7:admin"
	for i := 0; i < 5; i++ {
		assert.False(t, l.IsBlocked(key), "attempt %d should still be allowed", i+1)
		blocked := l.RecordFailure(key)
		assert.Equal(t, i == 4, blocked, "blocked flag on attempt %d", i+1)
	}
	assert.True(t, l.IsBlocked(key), "key should be locked after 5 failures")
}

func TestLimiterLockExpiresAfterWindow(t *testing.T) {
	clock := newFakeClock()
	l := New(5, 15*time.Minute, clock)

	key := "203.0.113.8:admin"
	for i := 0; i < 5; i++ {
		l.RecordFailure(key)
	}
	assert.True(t, l.IsBlocked(key))

	// just before expiry: still locked
	clock.advance(15*time.Minute - time.Second)
	assert.True(t, l.IsBlocked(key))

	// window expired: allowed again, and the counter starts over
	clock.advance(2 * time.Second)
	assert.False(t, l.IsBlocked(key))
	assert.False(t, l.RecordFailure(key), "first failure of the new window must not block")
	assert.False(t, l.IsBlocked(key))
}

func TestLimiterWindowRolloverResetsCount(t *testing.T) {
	clock := newFakeClock()
	l := New(3, 10*time.Minute, clock)

	key := "203.0.113.15:admin"
	l.RecordFailure(key)
	l.RecordFailure(key)

	// window passes with only 2 failures: no lock, count resets
	clock.advance(10*time.Minute + time.Second)
	assert.False(t, l.IsBlocked(key))
	assert.False(t, l.RecordFailure(key), "failures from the old window must not carry over")
	assert.False(t, l.IsBlocked(key))
}

func TestLimiterResetClearsState(t *testing.T) {
	clock := newFakeClock()
	l := New(3, 10*time.Minute, clock)

	key := "203.0.113.10:admin"
	l.RecordFailure(key)
	l.RecordFailure(key)
	l.Reset(key)
	assert.False(t, l.IsBlocked(key))
	assert.False(t, l.RecordFailure(key), "reset should start a fresh count")
}

func TestLimiterKeysAreIndependent(t *testing.T) {
	clock := newFakeClock()
	l := New(2, 10*time.Minute, clock)

	keyA := "203.0.113.11:admin"
	keyB := "203.0.113.12:admin"

	l.RecordFailure(keyA)
	assert.False(t, l.IsBlocked(keyB), "other keys must not be affected")
	assert.True(t, l.RecordFailure(keyA), "second failure of key A blocks it")
	assert.True(t, l.IsBlocked(keyA))
	assert.False(t, l.IsBlocked(keyB), "key B must remain unlocked")
}

func TestLimiterDisabledWhenMaxZero(t *testing.T) {
	clock := newFakeClock()
	l := New(0, 15*time.Minute, clock)

	key := "203.0.113.13:admin"
	for i := 0; i < 10; i++ {
		assert.False(t, l.RecordFailure(key), "max=0 must never block")
	}
	assert.False(t, l.IsBlocked(key))
}

func TestLimiterDisabledWhenWindowZero(t *testing.T) {
	clock := newFakeClock()
	l := New(5, 0, clock)

	key := "203.0.113.14:admin"
	for i := 0; i < 10; i++ {
		assert.False(t, l.RecordFailure(key), "window=0 must never block")
	}
	assert.False(t, l.IsBlocked(key))
}

func TestLimiterNilClockFallsBackToReal(t *testing.T) {
	l := New(5, time.Minute, nil)
	assert.False(t, l.IsBlocked("127.0.0.1:admin"))
	assert.False(t, l.RecordFailure("127.0.0.1:admin"))
}
