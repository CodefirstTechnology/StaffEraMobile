import type { AddressUnitValue } from '@/components/ui/AddressUnitFields';
import type { LocationValue } from '@/lib/locationTypes';

export type HouseOwnerProfile = {
  address?: string;
  city?: string;
  flatNo?: string;
  building?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
};

export function hasSavedHomeAddress(ho?: HouseOwnerProfile | null): boolean {
  if (!ho) return false;
  return !!(
    ho.address?.trim() &&
    ho.latitude != null &&
    ho.longitude != null &&
    !Number.isNaN(ho.latitude) &&
    !Number.isNaN(ho.longitude)
  );
}

export function homeLocationFromProfile(ho?: HouseOwnerProfile | null): LocationValue | null {
  if (!hasSavedHomeAddress(ho)) return null;
  return {
    address: ho!.address!.trim(),
    city: ho!.city,
    latitude: ho!.latitude!,
    longitude: ho!.longitude!,
    flatNo: ho!.flatNo,
    building: ho!.building,
    area: ho!.area,
  };
}

export function addressUnitFromProfile(ho?: HouseOwnerProfile | null): AddressUnitValue {
  return {
    flatNo: ho?.flatNo || '',
    building: ho?.building || '',
    area: ho?.area || '',
  };
}

export type BookingLocationMode = 'home' | 'current';

export function defaultBookingLocationMode(ho?: HouseOwnerProfile | null): BookingLocationMode {
  return hasSavedHomeAddress(ho) ? 'home' : 'current';
}
