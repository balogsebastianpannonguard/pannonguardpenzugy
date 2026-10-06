// Új személyes belépő link készítése egy munkatársnak (jelszó nélküli belépés a pénzügyi oldalra).
//
//   node --env-file=.env.local scripts/create-direct-link.mjs szucs.eva@pannonguard.hu https://pannonguardpenzugy.vercel.app
//   node --env-file=.env.local scripts/create-direct-link.mjs szucs.eva@pannonguard.hu https://pannonguardpenzugy.vercel.app --confirm
//
// --confirm nélkül csak próba, semmit nem ír. A staff_users kollekció közös a diszpécser felülettel és az
// Outlook-naptárral, ezért az új token érvényteleníti a felhasználó korábbi linkjét (mindenhol).
import { createHash, randomBytes } from "node:crypto";
import { MongoClient } from "mongodb";

const [email, baseUrl, ...flags] = process.argv.slice(2);
const confirm = flags.includes("--confirm");

if (!email || !baseUrl) {
  console.error("Használat: create-direct-link.mjs <email> <alap-url> [--confirm]");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
if (!uri || !dbName) {
  console.error("MONGODB_URI és MONGODB_DB szükséges (futtasd --env-file=.env.local kapcsolóval).");
  process.exit(1);
}

const client = new MongoClient(uri);
try {
  await client.connect();
  const col = client.db(dbName).collection("staff_users");
  const user = await col.findOne({ normalizedEmail: email.trim().toLowerCase() });
  if (!user) {
    console.error(`Nincs ilyen felhasználó: ${email}`);
    process.exit(1);
  }
  if (user.role !== "admin" && user.role !== "dispatcher") {
    console.error(`${email} szerepköre "${user.role}"; csak admin és diszpécser léphet be.`);
    process.exit(1);
  }
  if (!user.isActivated) {
    console.error(`${email} fiókja még nincs aktiválva.`);
    process.exit(1);
  }

  const token = randomBytes(32).toString("hex");
  const link = `${baseUrl.replace(/\/+$/, "")}/login?token=${token}`;

  if (!confirm) {
    console.log(
      `Próba: ${user.name ?? email} (${user.role}) ${user.directLoginTokenHash ? "meglévő linkjét lecserélné" : "új linket kapna"}. Futtasd újra --confirm kapcsolóval.`
    );
    process.exit(0);
  }

  await col.updateOne(
    { _id: user._id },
    {
      $set: {
        directLoginTokenHash: createHash("sha256").update(token).digest("hex"),
        directLoginCreatedAt: Date.now(),
        updatedAt: Date.now(),
      },
    }
  );
  console.log(`Új belépő link – ${user.name ?? email}:\n${link}`);
} finally {
  await client.close();
}
