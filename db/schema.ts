import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const contactRate = sqliteTable("contact_rate", {
  hour: integer().notNull(),
  bucket: text().notNull(),
  hits: integer().notNull(),
}, (table) => [primaryKey({ columns: [table.hour, table.bucket] })]);

export const contactSubmission = sqliteTable("contact_submission", {
  id: text().primaryKey(),
  payloadHash: text("payload_hash").notNull(),
  hour: integer().notNull(),
  clientBucket: text("client_bucket").notNull(),
  phoneBucket: text("phone_bucket").notNull(),
  accepted: integer().notNull().default(0),
}, (table) => [
  index("contact_submission_client_hour").on(table.hour, table.clientBucket),
  index("contact_submission_phone_hour").on(table.hour, table.phoneBucket),
]);

export const automationCheck = sqliteTable("automation_check", {
  id: integer().primaryKey(),
  startedAt: integer("started_at").notNull(),
  finishedAt: integer("finished_at"),
  results: text(),
});
