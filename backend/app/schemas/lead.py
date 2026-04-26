"""Pydantic v2 request / response models for /api/leads."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator


def _stripped(value: str) -> str:
    if not isinstance(value, str):
        return value
    return value.strip()


class LeadCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr = Field(max_length=320)
    organization: str = Field(min_length=1, max_length=200)

    @field_validator("name", "organization", mode="before")
    @classmethod
    def _trim(cls, v: str) -> str:
        return _stripped(v)

    @field_validator("email", mode="before")
    @classmethod
    def _normalise_email(cls, v: str) -> str:
        if not isinstance(v, str):
            return v
        return v.strip().lower()


class LeadResponse(BaseModel):
    ok: bool = True
    created: bool
