import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("prices")
export class Price {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  exchange: string;

  @Column("decimal", { precision: 20, scale: 8 })
  bid: number;

  @Column("decimal", { precision: 20, scale: 8 })
  ask: number;

  @Column("decimal", { precision: 20, scale: 8 })
  price: number;

  @Column()
  pair: string;

  @CreateDateColumn({ type: "timestamptz" })
  timestamp: Date;

  // Add index on timestamp and exchange for efficient querying
  @Column("timestamptz", { name: "created_at" })
  createdAt: Date;
}
