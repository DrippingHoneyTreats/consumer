import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

export type ItemStatus = "available" | "few_left" | "sold_out" | "pre_order";

export type ItemAttributes = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  images: string[];
  basePrice: number;
  status: ItemStatus;
  maxQty: number;
  leadTimeHours: number | null;
  active: boolean;
  sort: number;
  createdAt: Date;
  updatedAt: Date;
};

type ItemCreation = Optional<
  ItemAttributes,
  | "id"
  | "description"
  | "images"
  | "status"
  | "maxQty"
  | "leadTimeHours"
  | "active"
  | "sort"
  | "createdAt"
  | "updatedAt"
>;

export class Item extends Model<ItemAttributes, ItemCreation> implements ItemAttributes {
  declare id: string;
  declare categoryId: string;
  declare name: string;
  declare description: string | null;
  declare images: string[];
  declare basePrice: number;
  declare status: ItemStatus;
  declare maxQty: number;
  declare leadTimeHours: number | null;
  declare active: boolean;
  declare sort: number;
  declare createdAt: Date;
  declare updatedAt: Date;

  toPublic() {
    return {
      id: this.id,
      categoryId: this.categoryId,
      name: this.name,
      description: this.description,
      images: this.images ?? [],
      basePrice: this.basePrice,
      status: this.status,
      maxQty: this.maxQty,
      leadTimeHours: this.leadTimeHours,
    };
  }
}

Item.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "category_id",
    },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    images: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    basePrice: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "base_price",
    },
    status: {
      type: DataTypes.ENUM("available", "few_left", "sold_out", "pre_order"),
      allowNull: false,
      defaultValue: "available",
    },
    maxQty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      field: "max_qty",
    },
    leadTimeHours: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "lead_time_hours",
    },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sort: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: "updated_at" },
  },
  { sequelize, tableName: "items", underscored: true },
);
