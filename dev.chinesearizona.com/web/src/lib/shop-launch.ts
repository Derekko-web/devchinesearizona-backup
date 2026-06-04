function isEnabled(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

export function isShopRuntimeFallbackAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.PLAYWRIGHT_E2E === '1';
}

export function isShopPublicLaunchEnabled(): boolean {
  if (isShopRuntimeFallbackAllowed()) {
    return true;
  }

  return isEnabled(
    process.env.NEXT_PUBLIC_SHOP_PUBLIC_ENABLED ?? process.env.SHOP_PUBLIC_ENABLED
  );
}
