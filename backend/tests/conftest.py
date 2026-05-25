import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ.setdefault('DATABASE_URL', 'sqlite+aiosqlite:///./test.db')
os.environ.setdefault('GOOGLE_API_KEY', 'test-key')
os.environ.setdefault('GEMMA_MODEL', 'gemma-4-31b-it')
os.environ.setdefault('CORS_ORIGINS', '["http://localhost:3000"]')
