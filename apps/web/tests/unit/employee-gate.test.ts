import { describe, expect, it } from 'vitest';
import { PERSONA_CLAIMS } from '@/auth/claims';
import { employeeGate } from '@/auth/employee-gate';

describe('employeeGate', () => {
  it('allows a home-tenant member', () => {
    const result = employeeGate(PERSONA_CLAIMS.member);
    expect(result.allowed).toBe(true);
  });

  it('denies a guest/external account', () => {
    const result = employeeGate(PERSONA_CLAIMS.guest);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('guest-account');
  });

  it('denies an identity from a different (foreign) tenant', () => {
    const result = employeeGate(PERSONA_CLAIMS['foreign-tenant']);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('foreign-tenant');
  });

  it('denies when identifying claims are missing', () => {
    expect(employeeGate({ tid: PERSONA_CLAIMS.member.tid }).allowed).toBe(false);
    expect(employeeGate(null).allowed).toBe(false);
    expect(employeeGate(undefined).allowed).toBe(false);
  });
});
