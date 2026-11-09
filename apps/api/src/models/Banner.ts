import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

export type BannerAttributes = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image: string;
  ctaType: string | null;
  ctaTarget: string | null;
  ctaLabel: string | null;
  priority: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type BannerCreation = Optional<
  BannerAttributes,
  | "id"
  | "subtitle"
  | "description"
  | "ctaType"
  | "ctaTarget"
  | "ctaLabel"
  | "priority"
  | "active"
  | "createdAt"
  | "updatedAt"
>;

export class Banner extends Model<BannerAttributes, BannerCreation> implements BannerAttributes {
  declare id: string;
  declare title: string;
  declare subtitle: string | null;
  declare description: string | null;
  declare image: string;
  declare ctaType: string | null;
  declare ctaTarget: string | null;
  declare ctaLabel: string | null;
  declare priority: number;
  declare active: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;

  toPublic() {
    return {
      id: this.id,
      title: this.title,
      subtitle: this.subtitle,
      description: this.description,
      image: this.image,
      ctaType: this.ctaType ?? undefined,
      ctaTarget: this.ctaTarget,
      ctaLabel: this.ctaLabel,
    };
  }

  toAdmin() {
    return {
      ...this.toPublic(),
      priority: this.priority,
      active: this.active,
    };
  }
}

Banner.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: { type: DataTypes.STRING, allowNull: false },
    subtitle: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    image: { type: DataTypes.STRING, allowNull: false },
    ctaType: { type: DataTypes.STRING, allowNull: true, field: "cta_type" },
    ctaTarget: { type: DataTypes.STRING, allowNull: true, field: "cta_target" },
    ctaLabel: { type: DataTypes.STRING, allowNull: true, field: "cta_label" },
    priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: "updated_at" },
  },
  { sequelize, tableName: "banners", underscored: true },
);
