import crypto from "crypto";

/**
 * Decrypt incoming Flow request
 */
export const decryptRequest = (body, privateKeyPem) => {
  console.log("➡️ decryptRequest() CALLED");

  try {
    if (!privateKeyPem) {
      throw new Error("Private key is undefined");
    }
    privateKeyPem = privateKeyPem.replace(/\\n/g, "\n");
    console.log("📜 Private key provided:",privateKeyPem);
    console.log("🔑 Private key length:", privateKeyPem.length);
    console.log("🔑 Private key starts with:", privateKeyPem.slice(0, 30));
    console.log("🔑 Private key ends with:", privateKeyPem.slice(-30));

    if (
      !privateKeyPem.includes("-----BEGIN PRIVATE KEY-----") ||
      !privateKeyPem.includes("-----END PRIVATE KEY-----")
    ) {
      throw new Error("Invalid private key format (PEM boundary missing)");
    }

    /* --------------------------------------------------
       📦 PAYLOAD DIAGNOSTICS
    -------------------------------------------------- */
    const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

    console.log("🔑 encrypted_aes_key length:", encrypted_aes_key?.length);
    console.log("📦 encrypted_flow_data length:", encrypted_flow_data?.length);
    console.log("🧭 initial_vector length:", initial_vector?.length);

    /* --------------------------------------------------
       🔐 RSA DECRYPT (OAEP + SHA-256)
    -------------------------------------------------- */
    let aesKey;
    try {
      aesKey = crypto.privateDecrypt(
        {
          key: privateKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        Buffer.from(encrypted_aes_key, "base64")
      );
    } catch (err) {
      console.error("❌ RSA privateDecrypt FAILED");
      console.error(err.message);
      throw err;
    }

    console.log("✅ RSA decrypt OK");
    console.log("🔐 AES key length:", aesKey.length);

    if (aesKey.length !== 16) {
      throw new Error(`Invalid AES key length: ${aesKey.length}`);
    }

    /* --------------------------------------------------
       🔓 AES-GCM DECRYPT
    -------------------------------------------------- */
    const iv = Buffer.from(initial_vector, "base64");
    console.log("🧭 IV length:", iv.length);

    if (iv.length !== 16) {
      throw new Error(`Invalid IV length: ${iv.length}`);
    }

    const encryptedPayload = Buffer.from(encrypted_flow_data, "base64");
    console.log("📦 Encrypted payload bytes:", encryptedPayload.length);

    const TAG_LENGTH = 16;
    const encryptedBody = encryptedPayload.subarray(
      0,
      encryptedPayload.length - TAG_LENGTH
    );
    const tag = encryptedPayload.subarray(encryptedPayload.length - TAG_LENGTH);

    console.log("🏷️ Auth tag length:", tag.length);

    let decrypted;
    try {
      const decipher = crypto.createDecipheriv("aes-128-gcm", aesKey, iv);

      decipher.setAAD(Buffer.alloc(0));
      decipher.setAuthTag(tag);

      decrypted = Buffer.concat([
        decipher.update(encryptedBody),
        decipher.final(),
      ]).toString("utf8");
    } catch (err) {
      console.error("❌ AES-GCM decrypt FAILED");
      console.error(err.message);
      throw err;
    }

    console.log("✅ AES decrypt OK");
    console.log("📜 Decrypted string:", decrypted);

    return {
      decryptedBody: JSON.parse(decrypted),
      aesKey,
      iv,
    };
  } catch (err) {
    console.error("🔥 decryptRequest FAILED COMPLETELY");
    throw err;
  }
};




export const encryptResponse = (payload, aesKey, iv) => {
  console.log("➡️ encryptResponse() CALLED");
  console.log("📤 Payload:", payload);

  try {
    const flippedIV = Buffer.from(iv.map((b) => b ^ 0xff));

    const cipher = crypto.createCipheriv("aes-128-gcm", aesKey, flippedIV);

    // IMPORTANT: Explicit empty AAD
    cipher.setAAD(Buffer.alloc(0));

    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(payload), "utf8"),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    console.log("✅ encryptResponse OK");

    return encrypted.toString("base64");
  } catch (err) {
    console.error("❌ encryptResponse FAILED");
    console.error(err.message);
    throw err;
  }
};
