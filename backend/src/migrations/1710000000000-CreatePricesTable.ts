import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreatePricesTable1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "prices",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "exchange",
            type: "varchar",
          },
          {
            name: "bid",
            type: "decimal",
            precision: 20,
            scale: 8,
          },
          {
            name: "ask",
            type: "decimal",
            precision: 20,
            scale: 8,
          },
          {
            name: "price",
            type: "decimal",
            precision: 20,
            scale: 8,
          },
          {
            name: "pair",
            type: "varchar",
          },
          {
            name: "timestamp",
            type: "timestamptz",
            default: "now()",
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "now()",
          },
        ],
      }),
      true
    );

    // Create index on timestamp and exchange
    await queryRunner.query(
      `CREATE INDEX "IDX_prices_timestamp_exchange" ON "prices" ("timestamp", "exchange")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("prices");
  }
}
