// Minimal client-side key management for end-to-end encrypted chat (Module 3 will
// use these keys to encrypt messages). The private key never leaves this device.
//
// We generate an ECDH P-256 key pair, keep the private key in localStorage as a
// JWK, and hand the public key (base64 raw point) to the server.

const PRIV_KEY = 'cc_e2ee_private_jwk';
const PUB_KEY = 'cc_e2ee_public_b64';

function bufToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export function hasLocalKeypair() {
  return Boolean(localStorage.getItem(PRIV_KEY) && localStorage.getItem(PUB_KEY));
}

export function getLocalPublicKey() {
  return localStorage.getItem(PUB_KEY);
}

export async function generateAndStoreKeypair() {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits'],
  );
  const privJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const pubRaw = await crypto.subtle.exportKey('raw', pair.publicKey);
  const pubB64 = bufToB64(pubRaw);

  localStorage.setItem(PRIV_KEY, JSON.stringify(privJwk));
  localStorage.setItem(PUB_KEY, pubB64);
  return pubB64;
}

export function clearLocalKeypair() {
  localStorage.removeItem(PRIV_KEY);
  localStorage.removeItem(PUB_KEY);
}
