import { Migration } from '@mikro-orm/migrations';

export class Migration20250715110726 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "tax_provider" ("id" text not null, "is_enabled" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tax_provider_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tax_provider_deleted_at" ON "tax_provider" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "tax_region" ("id" text not null, "country_code" text not null, "province_code" text null, "metadata" jsonb null, "created_by" text null, "provider_id" text null, "parent_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tax_region_pkey" primary key ("id"), constraint CK_tax_region_provider_top_level check (parent_id IS NULL OR provider_id IS NULL), constraint CK_tax_region_country_top_level check (parent_id IS NULL OR province_code IS NOT NULL));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tax_region_provider_id" ON "tax_region" (provider_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tax_region_parent_id" ON "tax_region" (parent_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tax_region_deleted_at" ON "tax_region" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tax_region_unique_country_province" ON "tax_region" (country_code, province_code) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tax_region_unique_country_nullable_province" ON "tax_region" (country_code) WHERE province_code IS NULL AND deleted_at IS NULL;`);

    this.addSql(`create table if not exists "tax_rate" ("id" text not null, "rate" real null, "code" text not null, "name" text not null, "is_default" boolean not null default false, "is_combinable" boolean not null default false, "tax_region_id" text not null, "metadata" jsonb null, "created_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tax_rate_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tax_rate_tax_region_id" ON "tax_rate" (tax_region_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tax_rate_deleted_at" ON "tax_rate" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_single_default_region" ON "tax_rate" (tax_region_id) WHERE is_default = true AND deleted_at IS NULL;`);

    this.addSql(`create table if not exists "tax_rate_rule" ("id" text not null, "metadata" jsonb null, "created_by" text null, "tax_rate_id" text not null, "reference" text not null, "reference_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tax_rate_rule_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tax_rate_rule_tax_rate_id" ON "tax_rate_rule" (tax_rate_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tax_rate_rule_deleted_at" ON "tax_rate_rule" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tax_rate_rule_reference_id" ON "tax_rate_rule" (reference_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tax_rate_rule_unique_rate_reference" ON "tax_rate_rule" (tax_rate_id, reference_id) WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "tax_region" add constraint "tax_region_provider_id_foreign" foreign key ("provider_id") references "tax_provider" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table if exists "tax_region" add constraint "tax_region_parent_id_foreign" foreign key ("parent_id") references "tax_region" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "tax_rate" add constraint "tax_rate_tax_region_id_foreign" foreign key ("tax_region_id") references "tax_region" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "tax_rate_rule" add constraint "tax_rate_rule_tax_rate_id_foreign" foreign key ("tax_rate_id") references "tax_rate" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "tax_region" drop constraint if exists "tax_region_provider_id_foreign";`);

    this.addSql(`alter table if exists "tax_region" drop constraint if exists "tax_region_parent_id_foreign";`);

    this.addSql(`alter table if exists "tax_rate" drop constraint if exists "tax_rate_tax_region_id_foreign";`);

    this.addSql(`alter table if exists "tax_rate_rule" drop constraint if exists "tax_rate_rule_tax_rate_id_foreign";`);

    this.addSql(`drop table if exists "tax_provider" cascade;`);

    this.addSql(`drop table if exists "tax_region" cascade;`);

    this.addSql(`drop table if exists "tax_rate" cascade;`);

    this.addSql(`drop table if exists "tax_rate_rule" cascade;`);
  }

}
