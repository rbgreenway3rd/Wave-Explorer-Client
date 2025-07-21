// src/permissions.js
// Bitmask permission constants for user features

export const PERMISSIONS = {
  BASIC: 1 << 0, // 1: Login and main features
  CARDIAC: 1 << 1, // 2: Cardiac module access
  ADMIN: 255, // Admin (all features)
  // Add more as needed, e.g. NEW_FEATURE: 1 << 3
};
