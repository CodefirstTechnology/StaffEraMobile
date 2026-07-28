/** House owner contact is shared with the assigned servant after confirmation. */
export function showsHouseOwnerContact(status: string) {
  return status === 'CONFIRMED' || status === 'ACTIVE' || status === 'COMPLETED';
}

export function allowsContactActions(status: string) {
  return status === 'CONFIRMED' || status === 'ACTIVE';
}

export type HouseOwnerContact = {
  name?: string | null;
  phone?: string | null;
};
