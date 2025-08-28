import "dotenv/config";
import { setUser } from "../models/usermodel.js";

async function run() {
const list = process.env.SEED_USERS || "";
const pairs = list.split(",").map((s) => s.trim()).filter(Boolean);
for (const pair of pairs) {
const [tckn, pass] = pair.split(":");
if (tckn && pass) {
await setUser(tckn, pass);
console.log("Seeded:", tckn);
}
}
process.exit(0);
}
run();