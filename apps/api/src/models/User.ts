import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

export type UserRole = "CUSTOMER" | "STAFF" | "SUPER_ADMIN";

export type UserAttributes = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  role: UserRole;
  avatar: string | null;
  consentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type UserCreation = Optional<
  UserAttributes,
  | "id"
  | "phone"
  | "email"
  | "phoneVerified"
  | "emailVerified"
  | "role"
  | "avatar"
  | "consentAt"
  | "createdAt"
  | "updatedAt"
>;

export class User extends Model<UserAttributes, UserCreation> implements UserAttributes {
  declare id: string;
  declare fullName: string;
  declare phone: string | null;
  declare email: string | null;
  declare phoneVerified: boolean;
  declare emailVerified: boolean;
  declare role: UserRole;
  declare avatar: string | null;
  declare consentAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  toPublic() {
    return {
      id: this.id,
      fullName: this.fullName,
      phone: this.phone,
      email: this.email,
      phoneVerified: this.phoneVerified,
      emailVerified: this.emailVerified,
      role: this.role,
      avatar: this.avatar,
    };
  }

  toAdmin() {
    return {
      ...this.toPublic(),
      consentAt: this.consentAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "full_name",
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    phoneVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "phone_verified",
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "email_verified",
    },
    role: {
      type: DataTypes.ENUM("CUSTOMER", "STAFF", "SUPER_ADMIN"),
      allowNull: false,
      defaultValue: "CUSTOMER",
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    consentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "consent_at",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "users",
    underscored: true,
  },
);
