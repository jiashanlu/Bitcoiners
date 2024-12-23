import "reflect-metadata";
import { DataSource } from "typeorm";
import { Price } from "./models/Price";

const isProduction = process.env.NODE_ENV === "production";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [Price],
  migrations: [__dirname + "/migrations/*.{js,ts}"],
  ssl: {
    rejectUnauthorized: true,
  },
});
