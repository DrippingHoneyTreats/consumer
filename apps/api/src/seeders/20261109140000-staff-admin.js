"use strict";

const { randomUUID } = require("crypto");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = 'admin@drippinghoneytreats.com' LIMIT 1;`,
    );
    if (rows.length) return;

    const now = new Date();
    await queryInterface.bulkInsert("users", [
      {
        id: randomUUID(),
        full_name: "DHT Super Admin",
        phone: null,
        email: "admin@drippinghoneytreats.com",
        phone_verified: false,
        email_verified: true,
        role: "SUPER_ADMIN",
        avatar: null,
        consent_at: now,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("users", {
      email: "admin@drippinghoneytreats.com",
    });
  },
};
