import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeAppRedirect, safeChessRedirectPath, safeLivingRedirectPath } from '../../src/lib/auth/safeRedirect'
import { classifyOtpError, cleanOtp, isCompleteOtp, isValidEmail, otpErrorMessage } from '../../src/lib/auth/otp'

test('redirects: only same-app paths are followed', () => {
  assert.equal(safeChessRedirectPath('/chess/puzzles/fork?level=easy'), '/chess/puzzles/fork?level=easy')
  assert.equal(safeChessRedirectPath('/chess'), '/chess')
  for (const bad of [
    'https://evil.example/chess',
    '//evil.example',
    '/\\evil.example',
    '/chess/../admin',
    '/chessboard-shop',
    '/living/home',
    'chess/analysis',
    '/chess\n/x',
    '/chess/login',
    '/chess/signup?x=1',
    'javascript:alert(1)',
    '',
    undefined,
    null,
  ]) {
    assert.equal(safeChessRedirectPath(bad as string | null | undefined), '/chess/analysis', String(bad))
  }
  assert.equal(safeLivingRedirectPath('/living/billing'), '/living/billing')
  assert.equal(safeLivingRedirectPath('/chess/play'), '/living/home')
  assert.equal(safeLivingRedirectPath('/living/login'), '/living/home')
  assert.equal(safeLivingRedirectPath('//evil.example'), '/living/home')
  assert.equal(safeAppRedirect('/chess/a'.repeat(400), '/chess', '/chess'), '/chess')
})

test('otp: digits only, capped at six; complete means exactly six', () => {
  assert.equal(cleanOtp('123 456'), '123456')
  assert.equal(cleanOtp('12-34-56-78'), '123456')
  assert.equal(cleanOtp('abc12'), '12')
  assert.equal(isCompleteOtp('123456'), true)
  assert.equal(isCompleteOtp('12345'), false)
  assert.equal(isCompleteOtp('1234567'), false)
  assert.equal(isCompleteOtp('12345a'), false)
})

test('email check', () => {
  assert.equal(isValidEmail('name@example.com'), true)
  assert.equal(isValidEmail('  name@example.com '), true)
  for (const bad of ['', 'name', 'name@', '@example.com', 'a b@example.com', 'name@example']) assert.equal(isValidEmail(bad), false, bad)
})

test('otp errors: network, rate limit, wrong/expired are told apart', () => {
  assert.equal(classifyOtpError({ message: 'Failed to fetch' }), 'network')
  assert.equal(classifyOtpError({ message: 'NetworkError when attempting to fetch resource.' }), 'network')
  assert.equal(classifyOtpError({ message: 'Email rate limit exceeded', status: 429 }), 'rate')
  assert.equal(classifyOtpError({ message: 'Token has expired or is invalid', status: 403, code: 'otp_expired' }), 'incorrect')
  assert.equal(classifyOtpError({ message: 'Token has expired', status: 403 }), 'expired')
  assert.equal(classifyOtpError({ message: 'something else', status: 500 }), 'other')
  assert.match(otpErrorMessage('network', 'verify'), /couldn't reach the server/)
  assert.match(otpErrorMessage('incorrect', 'verify'), /isn't right, or it may have expired/)
})
