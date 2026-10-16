from decimal import Decimal
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class TradingSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"), extra="ignore", hide_input_in_errors=True
    )
    database_url: SecretStr = SecretStr("")
    coinbase_api_key: SecretStr = SecretStr("")
    coinbase_api_secret: SecretStr = SecretStr("")
    jev_api_key: SecretStr = SecretStr("")
    terminal_token: SecretStr = SecretStr("")
    jev_model: str = "jev-latest"
    trading_asset: str = Field(default="BTC", pattern=r"^[A-Z0-9]{2,12}$")
    trading_product_id: str = Field(default="", pattern=r"^[A-Za-z0-9_-]*$")
    trading_mode: Literal["preview", "live"] = "preview"
    trading_margin_usd: Decimal = Decimal("1")
    trading_max_position_usd: Decimal = Decimal("10")
    trading_max_daily_loss_usd: Decimal = Decimal("5")
    trading_min_confidence: Decimal = Decimal("0.6")
    trading_fee_reserve_usd: Decimal = Decimal("0.10")
    trading_slippage_bps: Decimal = Decimal("10")
    trading_cfm_confirmed: bool = False
    trading_autostart: bool = True

    @property
    def configured(self) -> bool:
        return all(
            s.get_secret_value()
            for s in (
                self.database_url,
                self.coinbase_api_key,
                self.coinbase_api_secret,
                self.jev_api_key,
                self.terminal_token,
            )
        )

    @model_validator(mode="after")
    def validate_configuration(self) -> "TradingSettings":
        token = self.terminal_token.get_secret_value()
        if token and len(token) < 32:
            raise ValueError("TERMINAL_TOKEN must contain at least 32 characters")
        db = self.database_url.get_secret_value()
        if db and not db.startswith("mysql+pymysql://"):
            raise ValueError("DATABASE_URL must use mysql+pymysql")
        if self.trading_mode == "live" and (not self.configured or not self.trading_cfm_confirmed):
            raise ValueError("Live mode requires all credentials and TRADING_CFM_CONFIRMED=true")
        return self
