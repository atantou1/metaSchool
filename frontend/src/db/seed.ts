import { initializeDatabase } from "./init";

async function main() {
  try {
    await initializeDatabase();
    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

main();
