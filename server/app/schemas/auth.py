from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator, EmailStr, field_serializer
import re


def to_camel(name: str) -> str:
    """Convert snake_case to camelCase."""
    parts = name.split('_')
    return parts[0] + ''.join(word.capitalize() for word in parts[1:])


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


# Auth schemas
class RegisterRequest(BaseSchema):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain one uppercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain one number')
        return v


class VerifyOtpRequest(BaseSchema):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class ResendOtpRequest(BaseSchema):
    email: EmailStr


class LoginRequest(BaseSchema):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseSchema):
    refresh_token: str


class ForgotPasswordRequest(BaseSchema):
    email: EmailStr


class ResetPasswordRequest(BaseSchema):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    password: str = Field(min_length=8, max_length=128)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain one uppercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain one number')
        return v


class UserPublic(BaseSchema):
    id: UUID
    full_name: str
    email: str
    is_verified: bool
    avatar_url: str | None = None
    created_at: datetime
    updated_at: datetime
    last_login_at: datetime | None = None
    
    @field_serializer('id')
    def serialize_id(self, value: UUID) -> str:
        return str(value)
    
    @field_serializer('created_at', 'updated_at', 'last_login_at')
    def serialize_datetime(self, value: datetime | None) -> str | None:
        if value is None:
            return None
        return value.isoformat()


class LoginResponse(BaseSchema):
    user: UserPublic
    token: str
    refresh_token: str


class TokenResponse(BaseSchema):
    token: str
    refresh_token: str


class MessageResponse(BaseSchema):
    message: str
    debug_otp: str | None = None


class TokenData(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserUpdate(BaseSchema):
    full_name: str | None = Field(None, min_length=2, max_length=120)
    avatar_url: str | None = None


class ChangePasswordRequest(BaseSchema):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain one uppercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain one number')
        return v
