import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE categories (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      name text NOT NULL,
      sort_order int NOT NULL,
      expiry_warn_days int  -- pastries 1
    );
    CREATE INDEX ON categories (tenant_id);

    -- What the POS sells.
    CREATE TABLE products (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      category_id uuid NOT NULL,
      name text NOT NULL,
      price bigint NOT NULL,
      is_visible_on_pos boolean NOT NULL,
      sort_order int NOT NULL,
      updated_by uuid NOT NULL,
      updated_at timestamptz NOT NULL
    );
    CREATE INDEX ON products (category_id);
    CREATE INDEX ON products (updated_by);
    CREATE INDEX ON products (tenant_id);

    CREATE TABLE modifier_groups (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      name text NOT NULL,  -- Milk
      min_select int NOT NULL,
      max_select int NOT NULL
    );
    CREATE INDEX ON modifier_groups (tenant_id);

    CREATE TABLE modifiers (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      group_id uuid NOT NULL,
      name text NOT NULL,  -- Oat milk
      price_delta bigint NOT NULL,
      sort_order int NOT NULL
    );
    CREATE INDEX ON modifiers (group_id);
    CREATE INDEX ON modifiers (tenant_id);

    CREATE TABLE product_modifier_groups (
      tenant_id uuid NOT NULL,
      product_id uuid NOT NULL,
      modifier_group_id uuid NOT NULL,
      PRIMARY KEY (product_id, modifier_group_id)
    );
    CREATE INDEX ON product_modifier_groups (tenant_id);

    -- Connects the menu to stock.
    CREATE TABLE recipe_lines (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      product_id uuid NOT NULL,
      inventory_item_id uuid NOT NULL,
      qty_base numeric NOT NULL  -- 18 (g), 180 (ml)
    );
    CREATE INDEX ON recipe_lines (product_id);
    CREATE INDEX ON recipe_lines (inventory_item_id);
    CREATE INDEX ON recipe_lines (tenant_id);

    CREATE TABLE modifier_recipe_lines (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      tenant_id uuid NOT NULL,
      modifier_id uuid NOT NULL,
      inventory_item_id uuid NOT NULL,
      qty_base_delta numeric NOT NULL  -- -180 fresh milk, +180 oat milk
    );
    CREATE INDEX ON modifier_recipe_lines (modifier_id);
    CREATE INDEX ON modifier_recipe_lines (inventory_item_id);
    CREATE INDEX ON modifier_recipe_lines (tenant_id);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    DROP TABLE modifier_recipe_lines, recipe_lines, product_modifier_groups, modifiers,
      modifier_groups, products, categories;
  `.execute(db);
}
