import { api } from './api';

export const CLAIM_TYPES = {
  isMine: 'is_mine',
  found: 'found',
};

export const CLAIM_STATUSES = {
  pending: 'pendiente',
  accepted: 'aceptado',
  rejected: 'rechazado',
  expired: 'vencido',
};

let claimsStore = [
  {
    id: 'claim-1',
    publicationId: 'pub-1',
    userId: 'user-1',
    targetUserId: 'user-2',
    type: CLAIM_TYPES.isMine,
    verificationAnswer: 'Sí, tiene la marca azul que se ve en la foto interior de la mochila.',
    description: 'La etiqueta del interior tiene mi nombre.',
    photoUri: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
    barrio: 'Palermo',
    status: CLAIM_STATUSES.pending,
    createdAt: Date.now() - 12 * 60 * 60 * 1000,
    expiresAt: Date.now() + 36 * 60 * 60 * 1000,
    decisionReason: '',
    meeting: null,
    claimCount: 1,
  },
  {
    id: 'claim-2',
    publicationId: 'pub-2',
    userId: 'user-2',
    targetUserId: 'user-1',
    type: CLAIM_TYPES.found,
    verificationAnswer: '',
    description: 'Lo encontré junto a la plaza.',
    photoUri: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
    barrio: 'Recoleta',
    status: CLAIM_STATUSES.accepted,
    createdAt: Date.now() - 30 * 60 * 60 * 1000,
    expiresAt: Date.now() + 18 * 60 * 60 * 1000,
    decisionReason: 'La foto coincide con el objeto publicado.',
    meeting: {
      address: 'Av. Santa Fe 2000, CABA',
      latitude: -34.5975,
      longitude: -58.3816,
      proposedBy: 'user-1',
      responseStatus: 'pending',
      notes: 'Quedamos junto a la entrada principal.',
    },
    claimCount: 2,
  },
];

const normalizeClaim = (claim) => ({
  id: claim.id || claim.claimId,
  publicationId: claim.publicationId || claim.publication_id || 'pub-demo',
  userId: claim.userId || claim.user_id || 'user-1',
  targetUserId: claim.targetUserId || claim.target_user_id || 'user-2',
  type: claim.type || CLAIM_TYPES.isMine,
  verificationAnswer: claim.verificationAnswer || claim.verification_answer || '',
  description: claim.description || '',
  photoUri: claim.photoUri || claim.photo_url || '',
  barrio: claim.barrio || claim.barrioNombre || '',
  status: claim.status || CLAIM_STATUSES.pending,
  createdAt: claim.createdAt || Date.now(),
  expiresAt: claim.expiresAt || Date.now() + 48 * 60 * 60 * 1000,
  decisionReason: claim.decisionReason || claim.decision_reason || '',
  meeting: claim.meeting || null,
  claimCount: claim.claimCount || 1,
});

const expirePendingClaims = (list) => {
  const now = Date.now();
  return list.map((claim) => {
    const shouldExpire = claim.status === CLAIM_STATUSES.pending && now > claim.expiresAt;
    return shouldExpire ? { ...claim, status: CLAIM_STATUSES.expired } : claim;
  });
};

const localGetClaimsForUser = async (userId) => {
  claimsStore = expirePendingClaims(claimsStore);
  return claimsStore.filter(
    (claim) => claim.userId === userId || claim.targetUserId === userId
  );
};

const localGetClaimById = async (claimId) =>
  claimsStore.find((claim) => claim.id === claimId) || null;

const localCreateClaim = async (payload) => {
  const count = claimsStore.filter(
    (claim) =>
      claim.publicationId === payload.publicationId && claim.userId === payload.userId
  ).length;

  if (count >= 3) {
    throw new Error('Se alcanzó el máximo de 3 reclamos por publicación.');
  }

  const claim = {
    id: `claim-${Date.now()}`,
    publicationId: payload.publicationId,
    userId: payload.userId,
    targetUserId: payload.targetUserId || 'user-2',
    type: payload.type,
    verificationAnswer: payload.verificationAnswer || '',
    description: payload.description || '',
    photoUri: payload.photoUri || '',
    barrio: payload.barrio || '',
    status: CLAIM_STATUSES.pending,
    createdAt: Date.now(),
    expiresAt: Date.now() + 48 * 60 * 60 * 1000,
    decisionReason: '',
    meeting: null,
    claimCount: count + 1,
  };

  claimsStore = [claim, ...claimsStore];
  return claim;
};

const localUpdateClaimStatus = async (claimId, nextStatus, actorId, reason = '') => {
  claimsStore = claimsStore.map((claim) => {
    if (claim.id !== claimId) return claim;
    return {
      ...claim,
      status: nextStatus,
      decisionReason: reason,
      reviewedBy: actorId,
    };
  });
  return claimsStore.find((claim) => claim.id === claimId);
};

const localProposeMeetingPoint = async (claimId, meeting) => {
  claimsStore = claimsStore.map((claim) => {
    if (claim.id !== claimId) return claim;
    return {
      ...claim,
      meeting: {
        ...meeting,
        responseStatus: 'pending',
        proposedBy: meeting.proposedBy,
      },
    };
  });
  return claimsStore.find((claim) => claim.id === claimId);
};

const localRespondToMeeting = async (claimId, action, payload) => {
  claimsStore = claimsStore.map((claim) => {
    if (claim.id !== claimId) return claim;
    if (!claim.meeting) return claim;
    return {
      ...claim,
      meeting: {
        ...claim.meeting,
        responseStatus: action === 'accept' ? 'accepted' : 'countered',
        notes: payload?.notes || claim.meeting.notes,
        address: payload?.address || claim.meeting.address,
        latitude: payload?.latitude ?? claim.meeting.latitude,
        longitude: payload?.longitude ?? claim.meeting.longitude,
      },
    };
  });
  return claimsStore.find((claim) => claim.id === claimId);
};

export const getClaimsForUser = async (userId) => {
  try {
    const { data } = await api.get('/claims/me', { params: { userId } });
    const claims = Array.isArray(data) ? data : data?.claims || [];
    return claims.map(normalizeClaim);
  } catch {
    return localGetClaimsForUser(userId);
  }
};

export const getClaimById = async (claimId) => {
  try {
    const { data } = await api.get(`/claims/${claimId}`);
    return normalizeClaim(data);
  } catch {
    return localGetClaimById(claimId);
  }
};

export const createClaim = async (payload) => {
  try {
    const { data } = await api.post('/claims', payload);
    return normalizeClaim(data);
  } catch {
    return localCreateClaim(payload);
  }
};

export const updateClaimStatus = async (claimId, nextStatus, actorId, reason = '') => {
  try {
    const { data } = await api.patch(`/claims/${claimId}/status`, {
      status: nextStatus,
      actorId,
      reason,
    });
    return normalizeClaim(data);
  } catch {
    return localUpdateClaimStatus(claimId, nextStatus, actorId, reason);
  }
};

export const proposeMeetingPoint = async (claimId, meeting) => {
  try {
    const { data } = await api.post(`/claims/${claimId}/meeting`, meeting);
    return normalizeClaim(data);
  } catch {
    return localProposeMeetingPoint(claimId, meeting);
  }
};

export const respondToMeeting = async (claimId, action, payload) => {
  try {
    const { data } = await api.patch(`/claims/${claimId}/meeting/response`, {
      action,
      ...payload,
    });
    return normalizeClaim(data);
  } catch {
    return localRespondToMeeting(claimId, action, payload);
  }
};

export const submitClaimRequest = async (payload) => {
  const response = await api.post('/claims', payload);
  return response.data;
};
