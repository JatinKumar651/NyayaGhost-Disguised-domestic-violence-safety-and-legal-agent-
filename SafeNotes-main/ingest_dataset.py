import os
from datasets import load_dataset
from supabase import create_client
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from tqdm import tqdm

# Load environment variables
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Must be service role key

# Create Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Load MentalChat16K dataset
dataset = load_dataset("ShenLab/MentalChat16K")

# Initialize embedding model (384-dim)
model = SentenceTransformer("all-MiniLM-L6-v2")

failed_count = 0
batch_size = 100
batch = []

print("⚙️ Inserting dataset into Supabase (batch inserts)...")

for row in tqdm(dataset["train"]):
    instruction = row.get("instruction", "").strip()
    input_text = row.get("input", "").strip()
    output_text = row.get("output", "").strip()

    if not instruction or not output_text:
        continue  # skip rows with missing essential data

    combined_text = f"{instruction}\n{input_text}\n{output_text}"
    embedding = model.encode(combined_text).tolist()  # 384-dim vector

    batch.append({
        "instruction": instruction,
        "input": input_text,
        "output": output_text,
        "embedding": embedding
    })

    # Insert batch when full
    if len(batch) >= batch_size:
        try:
            res = supabase.table("conversations").insert(batch).execute()
            if not res.data:
                failed_count += len(batch)
                print(f"Failed batch of {len(batch)} rows")
        except Exception as e:
            print(f"Exception during batch insert: {e}")
            failed_count += len(batch)
        batch = []

# Insert any remaining rows
if batch:
    try:
        res = supabase.table("conversations").insert(batch).execute()
        if not res.data:
            failed_count += len(batch)
            print(f"Failed final batch of {len(batch)} rows")
    except Exception as e:
        print(f"Exception during final batch insert: {e}")
        failed_count += len(batch)

print("✅ Dataset ingestion completed!")
print(f"Total failed inserts: {failed_count}")
