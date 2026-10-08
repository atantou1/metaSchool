import { db } from "./frontend/src/db";
import * as schema from "./frontend/src/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  const req = await fetch("http://127.0.0.1:3000/api/timetable/diagnose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  const res = await req.json();
  console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);
