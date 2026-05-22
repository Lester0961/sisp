import sys
import os

# Add parent directory to path so app module can be found
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sqlalchemy import text
from app.database import engine

def init_vector_db():
    print("Connecting to database to initialize pgvector and VectorEmbeddings table...")
    try:
        with engine.connect() as conn:
            # Enable pgvector extension
            print("Enabling pgvector extension if not exists...")
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            
            # Create VectorEmbeddings table
            print("Creating VectorEmbeddings table if not exists...")
            create_table_query = """
            CREATE TABLE IF NOT EXISTS "VectorEmbeddings" (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                content TEXT NOT NULL,
                embedding vector(384) NOT NULL,
                source VARCHAR(255),
                category VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
            """
            conn.execute(text(create_table_query))
            conn.commit()
            print("Database successfully initialized!")
            return True
    except Exception as e:
        print(f"Failed to initialize database: {e}")
        return False

if __name__ == "__main__":
    init_vector_db()
