import "reflect-metadata";
import { DataSource } from "typeorm";
import { Price } from "./models/Price";

const isProduction = process.env.NODE_ENV === "production";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [Price],
  migrations: [__dirname + "/migrations/*.{js,ts}"],
  migrationsRun: true, // Automatically run migrations on startup
  ssl: isProduction
    ? {
        rejectUnauthorized: false,
      }
    : false,
});

// Initialize database with retries
const initializeDB = async () => {
  let retries = 10;
  while (retries > 0) {
    try {
      await AppDataSource.initialize();
      console.log("Data Source has been initialized!");
      break;
    } catch (err) {
      console.error("Error during Data Source initialization:", err);
      retries -= 1;
      console.log(`Retries left: ${retries}`);
      await new Promise(res => setTimeout(res, 3000)); // Wait 3 seconds
    }
  }
  if (retries === 0) {
    throw new Error("Failed to initialize database after multiple retries");
  }
};

export { initializeDB };
