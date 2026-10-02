-- AlterTable: rename in place so existing accounts keep their names.
ALTER TABLE "users" RENAME COLUMN "full_name" TO "user_name";
