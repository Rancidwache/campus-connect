// Client-side end-to-end encryption for chat.
//
// Key exchange (Signal Protocol-style, per the proposal): each device holds a
// long-term ECDH P-256 key pair. The private key never leaves the device
// (localStorage as a JWK); the public key is uploaded to the server. To talk to
// a peer, we do ECDH(our private, their public) -> HKDF-SHA256 -> a 256-bit
// AES-GCM key, and encrypt each message with a fresh random IV. The server only
// ever stores/relays the ciphertext string.
//
// This is a static shared key (no Double Ratchet / forward secrecy yet — noted
// as future work, matching the proposal's "-style").

const PRIV_KEY = 'cc_e2ee_private_jwk';
const PUB_KEY = 'cc_e2ee_public_b64';
const HKDF_INFO = new TextEncoder().encode('campus-connect-v2/e2ee/v1');

function bufToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b64ToBuf(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out.buffer;
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
    ['deriveBits'],
  );
  const privJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const pubRaw = await crypto.subtle.exportKey('raw', pair.publicKey);
  const pubB64 = bufToB64(pubRaw);

  localStorage.setItem(PRIV_KEY, JSON.stringify(privJwk));
  localStorage.setItem(PUB_KEY, pubB64);
  peerKeyCache.clear();
  return pubB64;
}

export function clearLocalKeypair() {
  localStorage.removeItem(PRIV_KEY);
  localStorage.removeItem(PUB_KEY);
  peerKeyCache.clear();
}

async function loadPrivateKey() {
  const jwk = localStorage.getItem(PRIV_KEY);
  if (!jwk) throw new Error('No local encryption key — set one up in your profile.');
  return crypto.subtle.importKey(
    'jwk',
    JSON.parse(jwk),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits'],
  );
}

const peerKeyCache = new Map(); // peerPublicKeyB64 -> Promise<CryptoKey (AES-GCM)>

export function deriveSharedKey(peerPublicKeyB64) {
  if (!peerKeyCache.has(peerPublicKeyB64)) {
    peerKeyCache.set(
      peerPublicKeyB64,
      (async () => {
        const priv = await loadPrivateKey();
        const peerPub = await crypto.subtle.importKey(
          'raw',
          b64ToBuf(peerPublicKeyB64),
          { name: 'ECDH', namedCurve: 'P-256' },
          false,
          [],
        );
        const secret = await crypto.subtle.deriveBits(
          { name: 'ECDH', public: peerPub },
          priv,
          256,
        );
        const hkdfKey = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
        return crypto.subtle.deriveKey(
          { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: HKDF_INFO },
          hkdfKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt'],
        );
      })(),
    );
  }
  return peerKeyCache.get(peerPublicKeyB64);
}

// -> "v1.<ivB64>.<ciphertextB64>"
export async function encryptMessage(peerPublicKeyB64, plaintext) {
  const key = await deriveSharedKey(peerPublicKeyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `v1.${bufToB64(iv)}.${bufToB64(ct)}`;
}

export async function decryptMessage(peerPublicKeyB64, payload) {
  try {
    const [v, ivB64, ctB64] = String(payload).split('.');
    if (v !== 'v1' || !ivB64 || !ctB64) return null;
    const key = await deriveSharedKey(peerPublicKeyB64);
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(ivB64)) },
      key,
      b64ToBuf(ctB64),
    );
    return new TextDecoder().decode(pt);
  } catch {
    return null; // wrong key, tampered, or a message from another device
  }
}
