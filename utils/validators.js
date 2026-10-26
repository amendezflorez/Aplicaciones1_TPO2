import { PASSWORD_MIN_LENGTH } from '../config/constants';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s-]{8,15}$/;

export const isValidEmail = (email) => EMAIL_REGEX.test(email.trim());

export const isValidPassword = (password) =>
  password.length >= PASSWORD_MIN_LENGTH &&
  /[A-Za-z]/.test(password) &&
  /[0-9]/.test(password);

export const isValidPhone = (phone) => PHONE_REGEX.test(phone.trim());

export const isValidName = (name) => name.trim().length >= 2;
