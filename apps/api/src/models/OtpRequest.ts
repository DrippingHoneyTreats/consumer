import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

export type OtpChannel = "sms" | "email" | "whatsapp";
export type OtpStatus = "pending" | "verified" | "expired" | "locked";

export type OtpRequestAttributes = {
  id: string;
  contact: string;
  channel: OtpChannel;
  purpose: string;
  codeHash: string;
  attempts: number;
  status: OtpStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type OtpCreation = Optional<
  OtpRequestAttributes,
  "id" | "attempts" | "status" | "createdAt" | "updatedAt"
>;

export class OtpRequest
  extends Model<OtpRequestAttributes, OtpCreation>
  implements OtpRequestAttributes
{
  declare id: string;
  declare contact: string;
  declare channel: OtpChannel;
  declare purpose: string;
  declare codeHash: string;
  declare attempts: number;
  declare status: OtpStatus;
  declare expiresAt: Date;
  declare createdAt: Date;
  declare updatedAt: Date;
}

OtpRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    contact: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    channel: {
      type: DataTypes.ENUM("sms", "email", "whatsapp"),
      allowNull: false,
    },
    purpose: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "register",
    },
    codeHash: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "code_hash",
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("pending", "verified", "expired", "locked"),
      allowNull: false,
      defaultValue: "pending",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
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
    tableName: "otp_requests",
    underscored: true,
  },
);
