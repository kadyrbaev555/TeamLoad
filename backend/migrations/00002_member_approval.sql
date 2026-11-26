-- +goose Up
-- The owner approves each member before roles can be distributed.
-- Members who joined before this change count as approved.
ALTER TABLE project_members ADD COLUMN approved boolean NOT NULL DEFAULT false;
UPDATE project_members SET approved = true;

-- +goose Down
ALTER TABLE project_members DROP COLUMN approved;
