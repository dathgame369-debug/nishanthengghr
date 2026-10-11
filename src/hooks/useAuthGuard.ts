import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyJWT } from '@/utils/jwt';

const TOKEN_KEY = 'hr_jwt';

/**
 * Verifies the stored JWT on mount and redirects to '/' if invalid or expired.
 * Also sets up a periodic re-check every 5 minutes so stale sessions auto-logout.
 *
 * Usage: call inside any protected page/layout component.
 */
export function useAuthGuard() {
  const navigate = useNavigate();

  async function check() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      navigate('/', { replace: true });
      return;
    }
    const result = await verifyJWT(token);
    if (!result.valid) {
      localStorage.removeItem(TOKEN_KEY);
      navigate('/', { replace: true });
    }
  }

  const checkRef = useRef(check);
  checkRef.current = check;

  useEffect(() => {
    checkRef.current();

    // Re-verify every 5 minutes
    const interval = setInterval(() => checkRef.current(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
}
