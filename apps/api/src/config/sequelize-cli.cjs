require("dotenv").config();

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is required for sequelize-cli");
}

module.exports = {
  development: { url, dialect: "postgres", logging: console.log },
  test: { url, dialect: "postgres", logging: false },
  production: { url, dialect: "postgres", logging: false },
};
