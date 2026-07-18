DROP INDEX "account_tokens_user_type_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "account_tokens_one_active_type_idx" ON "account_tokens" USING btree ("user_id","type");