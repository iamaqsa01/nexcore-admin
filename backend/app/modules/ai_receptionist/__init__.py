"""AI Receptionist product module (backend).

Owns AI-specific authorization and quota enforcement. Reuses the core
Client / Subscription / SubscriptionEntitlement / CallLog tables — it does
not define its own.
"""
