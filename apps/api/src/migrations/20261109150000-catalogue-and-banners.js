"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("categories", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING, allowNull: false },
      slug: { type: Sequelize.STRING, allowNull: false, unique: true },
      image: { type: Sequelize.STRING, allowNull: true },
      sort: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.sequelize.query(
      `DO $$ BEGIN CREATE TYPE "enum_items_status" AS ENUM ('available','few_left','sold_out','pre_order'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );

    await queryInterface.createTable("items", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
        allowNull: false,
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "categories", key: "id" },
        onDelete: "CASCADE",
      },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      images: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      base_price: { type: Sequelize.INTEGER, allowNull: false },
      status: {
        type: Sequelize.ENUM("available", "few_left", "sold_out", "pre_order"),
        allowNull: false,
        defaultValue: "available",
      },
      max_qty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 20 },
      lead_time_hours: { type: Sequelize.INTEGER, allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      sort: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("items", ["category_id"]);

    await queryInterface.createTable("banners", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
        allowNull: false,
      },
      title: { type: Sequelize.STRING, allowNull: false },
      subtitle: { type: Sequelize.STRING, allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      image: { type: Sequelize.STRING, allowNull: false },
      cta_type: { type: Sequelize.STRING, allowNull: true },
      cta_target: { type: Sequelize.STRING, allowNull: true },
      cta_label: { type: Sequelize.STRING, allowNull: true },
      priority: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("banners");
    await queryInterface.dropTable("items");
    await queryInterface.dropTable("categories");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_items_status";');
  },
};
