export type VisitAddressParts = {
  flatNo?: string | null;
  building?: string | null;
  area?: string | null;
  address?: string | null;
};

/** Lines for display: area → building → flat → street address */
export function formatVisitAddressLines(parts: VisitAddressParts): string[] {
  const lines: string[] = [];
  const area = parts.area?.trim();
  const building = parts.building?.trim();
  const flat = parts.flatNo?.trim();
  if (area) lines.push(area);
  if (building) lines.push(building);
  if (flat) lines.push(`Flat ${flat}`);
  if (parts.address?.trim()) lines.push(parts.address.trim());
  return lines;
}

export function hasVisitAddressDetail(parts: VisitAddressParts): boolean {
  return formatVisitAddressLines(parts).length > 0;
}
