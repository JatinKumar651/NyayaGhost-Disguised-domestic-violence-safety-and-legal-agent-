-- =============================================================================
-- CHAT HISTORY TABLE FOR CHATBOT SYSTEM
-- =============================================================================

-- Create chat_history table
CREATE TABLE chat_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'anonymous',
    message TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    agent TEXT,
    intent TEXT,
    session_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);
CREATE INDEX idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX idx_chat_history_agent ON chat_history(agent);
CREATE INDEX idx_chat_history_intent ON chat_history(intent);

-- Enable Row Level Security (RLS)
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy for authenticated users to see their own chat history
CREATE POLICY "Users can view their own chat history" ON chat_history
    FOR SELECT USING (
        auth.uid()::text = user_id OR 
        user_id = 'anonymous'
    );

-- Policy for authenticated users to insert their own chat messages
CREATE POLICY "Users can insert their own chat messages" ON chat_history
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id OR 
        user_id = 'anonymous'
    );

-- Policy for authenticated users to update their own chat messages
CREATE POLICY "Users can update their own chat messages" ON chat_history
    FOR UPDATE USING (
        auth.uid()::text = user_id OR 
        user_id = 'anonymous'
    );

-- Policy for authenticated users to delete their own chat messages
CREATE POLICY "Users can delete their own chat messages" ON chat_history
    FOR DELETE USING (
        auth.uid()::text = user_id OR 
        user_id = 'anonymous'
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_chat_history_updated_at_trigger
    BEFORE UPDATE ON chat_history
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_history_updated_at();

-- Function to clean up old chat history (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_chat_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM chat_history 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a view for recent chat history with better formatting
CREATE OR REPLACE VIEW recent_chat_history AS
SELECT 
    id,
    user_id,
    message,
    role,
    agent,
    intent,
    session_id,
    metadata,
    created_at,
    updated_at,
    CASE 
        WHEN role = 'user' THEN '👤 User'
        WHEN role = 'assistant' THEN '🤖 ' || COALESCE(agent, 'Assistant')
        ELSE '⚙️ System'
    END as formatted_role
FROM chat_history
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Grant necessary permissions
GRANT ALL ON chat_history TO authenticated;
GRANT ALL ON chat_history TO anon;
GRANT SELECT ON recent_chat_history TO authenticated;
GRANT SELECT ON recent_chat_history TO anon;
