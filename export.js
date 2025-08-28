import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read JSON file manually
const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, "serviceAccountKey.json"), "utf8")
);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function exportAllCollections() {
  const collections = await db.listCollections();
  console.log(`📦 Found ${collections.length} collections.`);

  for (const collection of collections) {
    const name = collection.id;
    console.log(`🚀 Exporting collection: ${name}`);
    const snapshot = await collection.get();

    const docs = [];
    snapshot.forEach((doc) => {
      docs.push({ id: doc.id, ...doc.data() });
    });

    const filePath = path.join(__dirname, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));

    console.log(`✅ Exported ${docs.length} documents to ${filePath}`);
  }
}

exportAllCollections()
  .then(() => {
    console.log("🎉 All collections exported successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed to export collections:", error);
    process.exit(1);
  });
