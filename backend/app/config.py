from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# The SubscriptionEntitlement.key the AI Receptionist module stores the
# monthly talk-time limit under (see ../../prisma/schema.prisma and
# modules/ai-receptionist/manifest.ts). Integer minutes in `intValue`.
MONTHLY_TALK_TIME_MINUTES_KEY = "monthly_talk_time_minutes"

# Prisma Product.key for this module (see prisma/seed.ts).
AI_RECEPTIONIST_PRODUCT_KEY = "AI_RECEPTIONIST"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = ""
    admin_service_secret: str = ""

    session_reservation_ttl_seconds: int = 2 * 60 * 60
    default_estimated_session_seconds: int = 5 * 60

    entitlement_key_monthly_minutes: str = MONTHLY_TALK_TIME_MINUTES_KEY
    ai_receptionist_product_key: str = AI_RECEPTIONIST_PRODUCT_KEY


@lru_cache
def get_settings() -> Settings:
    return Settings()
