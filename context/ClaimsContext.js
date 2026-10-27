import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  CLAIM_STATUSES,
  createClaim,
  getClaimsForUser,
  proposeMeetingPoint,
  respondToMeeting,
  updateClaimStatus,
} from '../services/claimsService';

export const ClaimsContext = createContext(null);

export function ClaimsProvider({ children }) {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);

  const refreshClaims = useCallback(async () => {
    if (!user?.id) {
      setClaims([]);
      return;
    }

    const nextClaims = await getClaimsForUser(user.id);
    setClaims(nextClaims);
  }, [user?.id]);

  useEffect(() => {
    refreshClaims();
  }, [refreshClaims]);

  const submitClaim = useCallback(
    async (payload) => {
      if (!user?.id) throw new Error('Sesión requerida');
      const nextClaim = await createClaim({ ...payload, userId: user.id });
      setClaims((current) => [nextClaim, ...current]);
      return nextClaim;
    },
    [user?.id]
  );

  const decideClaim = useCallback(
    async (claimId, nextStatus, actorId, reason = '') => {
      const nextClaim = await updateClaimStatus(claimId, nextStatus, actorId, reason);
      setClaims((current) =>
        current.map((claim) => (claim.id === claimId ? nextClaim : claim))
      );
      return nextClaim;
    },
    []
  );

  const addMeetingProposal = useCallback(async (claimId, meeting) => {
    const nextClaim = await proposeMeetingPoint(claimId, meeting);
    setClaims((current) =>
      current.map((claim) => (claim.id === claimId ? nextClaim : claim))
    );
    return nextClaim;
  }, []);

  const answerMeeting = useCallback(async (claimId, action, payload) => {
    const nextClaim = await respondToMeeting(claimId, action, payload);
    setClaims((current) =>
      current.map((claim) => (claim.id === claimId ? nextClaim : claim))
    );
    return nextClaim;
  }, []);

  const myClaims = useMemo(
    () => claims.filter((claim) => claim.userId === user?.id),
    [claims, user?.id]
  );

  const receivedClaims = useMemo(
    () => claims.filter((claim) => claim.targetUserId === user?.id),
    [claims, user?.id]
  );

  const value = useMemo(
    () => ({
      claims,
      myClaims,
      receivedClaims,
      refreshClaims,
      submitClaim,
      decideClaim,
      addMeetingProposal,
      answerMeeting,
      claimStatuses: CLAIM_STATUSES,
    }),
    [claims, myClaims, receivedClaims, refreshClaims, submitClaim, decideClaim, addMeetingProposal, answerMeeting]
  );

  return <ClaimsContext.Provider value={value}>{children}</ClaimsContext.Provider>;
}

export function useClaims() {
  const context = useContext(ClaimsContext);
  if (!context) {
    throw new Error('useClaims debe usarse dentro de <ClaimsProvider>');
  }
  return context;
}
