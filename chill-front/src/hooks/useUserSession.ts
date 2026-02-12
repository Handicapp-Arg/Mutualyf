import { useState, useEffect, useRef } from 'react';
import { UserIdentificationSystem } from '../infrastructure/user/UserIdentificationSystem';
import type { UserSession } from '../types/user';
import { getUserIP } from '../utils/getUserIP';
import { setUserFingerprint, setCurrentUserName, setUserIP } from '../services/userPersistenceService';

export function useUserSession() {
  const userSystemRef = useRef<UserIdentificationSystem | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    if (!userSystemRef.current) {
      userSystemRef.current = new UserIdentificationSystem();
    }
    getUserIP().then(async (userIP) => {
      if (!userSystemRef.current) return;
      
      // Guardar IP para persistencia
      setUserIP(userIP);
      
      const userSession = await userSystemRef.current.identifyUser({
        ip: userIP,
        userAgent: navigator.userAgent,
        headers: {
          'accept-language': navigator.language,
          'x-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      });
      setSession(userSession);
      setSessionId(userSession.id);
      
      // 🔑 Establecer fingerprint y nombre para persistencia
      if (userSession.fingerprint) {
        setUserFingerprint(userSession.fingerprint);
      }
      if (userSession.name) {
        setCurrentUserName(userSession.name);
        console.log(`👋 Usuario conocido: ${userSession.name}`);
      }
    });
    return () => {
      userSystemRef.current?.destroy();
    };
  }, []);

  return {
    userSystem: userSystemRef.current,
    session,
    sessionId,
    setSessionId,
  };
}
