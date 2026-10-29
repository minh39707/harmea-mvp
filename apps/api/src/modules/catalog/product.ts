export function productSnapshot(p: Record<string, unknown>) {
  return {
    id: String(p.id),
    name: String(p.name),
    unitPriceVnd: Number(p.unit_price_vnd),
    currency: 'VND',
    templateVersion: String(p.template_version),
    isDemo: Boolean(p.is_demo),
    physicalSizeMm: { width: 54, height: 86 },
    artworkSizeMm: { width: 57, height: 90 },
    safeAreaMm: { width: 49, height: 82 }
  };
}
