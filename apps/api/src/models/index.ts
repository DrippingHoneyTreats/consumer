import { Banner } from "./Banner";
import { Category } from "./Category";
import { Item } from "./Item";
import { OtpRequest } from "./OtpRequest";
import { User } from "./User";

Category.hasMany(Item, { foreignKey: "categoryId", as: "items" });
Item.belongsTo(Category, { foreignKey: "categoryId", as: "category" });

export const models = {
  User,
  OtpRequest,
  Category,
  Item,
  Banner,
};

export { User, OtpRequest, Category, Item, Banner };
