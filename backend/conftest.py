import sys
from pathlib import Path

# Ensure `import app...` resolves when pytest is run from anywhere.
_ROOT = Path(__file__).parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
