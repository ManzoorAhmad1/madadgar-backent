-- Fix chat_messages table to allow admin messages without valid sender_id
-- Admin messages will have sender_id = NULL instead of 0

-- Drop the existing foreign key constraint
ALTER TABLE chat_messages 
DROP FOREIGN KEY chat_messages_ibfk_2;

-- Modify sender_id to allow NULL values
ALTER TABLE chat_messages 
MODIFY COLUMN sender_id INT NULL;

-- Add back the foreign key constraint that allows NULL
ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_ibfk_2 
FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
