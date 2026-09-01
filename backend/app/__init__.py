"""NexCore backend — AI Receptionist authorization + quota enforcement.

This service is NOT the admin panel and NOT the AI Receptionist voice runtime.
It is the server-to-server authority that answers one question for every new
AI Receptionist session: ALLOW or BLOCK.
"""

__version__ = "0.1.0"
