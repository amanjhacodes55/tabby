export type CurrencyInfo = { code: string; symbol: string; name: string; decimals: number; locale: string };

export const CURRENCIES: CurrencyInfo[] = [
  { code: "INR", symbol: "₹", name: "Indian Rupee", decimals: 2, locale: "en-IN" },
  { code: "USD", symbol: "$", name: "US Dollar", decimals: 2, locale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro", decimals: 2, locale: "en-IE" },
  { code: "GBP", symbol: "£", name: "British Pound", decimals: 2, locale: "en-GB" },
  { code: "AED", symbol: "AED", name: "UAE Dirham", decimals: 2, locale: "en-AE" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", decimals: 2, locale: "en-SG" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", decimals: 2, locale: "en-AU" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", decimals: 2, locale: "en-CA" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", decimals: 0, locale: "ja-JP" },
  { code: "THB", symbol: "฿", name: "Thai Baht", decimals: 2, locale: "th-TH" },
  { code: "NPR", symbol: "Rs", name: "Nepalese Rupee", decimals: 2, locale: "en-NP" },
  { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee", decimals: 2, locale: "en-LK" },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [string, ...string[]];

export function getCurrency(code: string): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}
