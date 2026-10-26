import { api } from './api';

export const requestRegisterOtp = (email) => api.post('/auth/register/request-otp', { email });

export const verifyRegisterOtp = async (email, code) =>
  (await api.post('/auth/register/verify-otp', { email, code })).data;

export const completeRegister = async (registrationToken, password) =>
  (await api.post('/auth/register/complete', { registrationToken, password })).data;

export const loginRequest = async (email, password) =>
  (await api.post('/auth/login', { email, password })).data;

export const forgotPassword = (email) => api.post('/auth/password/forgot', { email });

export const resetPassword = (email, code, newPassword) =>
  api.post('/auth/password/reset', { email, code, newPassword });

// purpose: 'register' | 'reset'
export const resendOtp = (email, purpose) => api.post('/auth/otp/resend', { email, purpose });
