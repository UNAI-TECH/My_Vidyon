import { getDashboardRouteForRole } from '../src/utils/navigationHelper';

describe('navigationHelper tests', () => {
  it('resolves correct dashboard for admin roles', () => {
    expect(getDashboardRouteForRole('admin')).toBe('/(root)/admin');
    expect(getDashboardRouteForRole('superadmin')).toBe('/(root)/admin');
  });

  it('resolves correct dashboard for institution and finance roles', () => {
    expect(getDashboardRouteForRole('institution')).toBe('/(root)/institution');
    expect(getDashboardRouteForRole('accountant')).toBe('/(root)/institution');
    expect(getDashboardRouteForRole('finance')).toBe('/(root)/institution');
  });

  it('resolves correct dashboard for faculty', () => {
    expect(getDashboardRouteForRole('faculty')).toBe('/(root)/faculty');
  });

  it('resolves correct dashboard for student and parent', () => {
    expect(getDashboardRouteForRole('student')).toBe('/(root)/student');
    expect(getDashboardRouteForRole('parent')).toBe('/(root)/parent');
  });

  it('resolves correct dashboard for canteen and canteen_manager', () => {
    expect(getDashboardRouteForRole('canteen')).toBe('/(root)/canteen');
    expect(getDashboardRouteForRole('canteen_manager')).toBe('/(root)/canteen');
  });

  it('returns login route when role is null or undefined', () => {
    expect(getDashboardRouteForRole(null)).toBe('/(auth)/login');
    expect(getDashboardRouteForRole(undefined)).toBe('/(auth)/login');
  });
});
