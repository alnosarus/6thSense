import pytest
from pydantic import ValidationError

from app.schemas import LeadCreate


def test_valid_lead():
    lead = LeadCreate(name="Ada", email="A@X.com", organization="Acme")
    # email lowercased, fields trimmed
    assert lead.email == "a@x.com"
    assert lead.name == "Ada"


def test_trims_whitespace():
    lead = LeadCreate(name="  Ada  ", email="  a@x.com  ", organization="  Acme  ")
    assert lead.name == "Ada"
    assert lead.email == "a@x.com"
    assert lead.organization == "Acme"


def test_rejects_blank_after_trim():
    with pytest.raises(ValidationError):
        LeadCreate(name="   ", email="a@x.com", organization="Acme")


def test_rejects_invalid_email():
    with pytest.raises(ValidationError):
        LeadCreate(name="Ada", email="not-an-email", organization="Acme")


def test_rejects_oversize_name():
    with pytest.raises(ValidationError):
        LeadCreate(name="a" * 201, email="a@x.com", organization="Acme")


def test_rejects_oversize_email():
    # max_length=320 — anything over should fail. 315 a's + "@x.com" = 321 chars.
    bad = "a" * 315 + "@x.com"
    with pytest.raises(ValidationError):
        LeadCreate(name="Ada", email=bad, organization="Acme")
