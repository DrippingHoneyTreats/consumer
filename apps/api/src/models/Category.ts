import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

export type CategoryAttributes = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  sort: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CategoryCreation = Optional<
  CategoryAttributes,
  "id" | "image" | "sort" | "active" | "createdAt" | "updatedAt"
>;

export class Category
  extends Model<CategoryAttributes, CategoryCreation>
  implements CategoryAttributes
{
  declare id: string;
  declare name: string;
  declare slug: string;
  declare image: string | null;
  declare sort: number;
  declare active: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;

  toPublic() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      image: this.image,
      sort: this.sort,
    };
  }

  toAdmin() {
    return { ...this.toPublic(), active: this.active };
  }
}

Category.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    image: { type: DataTypes.STRING, allowNull: true },
    sort: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: "updated_at" },
  },
  { sequelize, tableName: "categories", underscored: true },
);
