/** Helper contact is shared with the house owner after the helper accepts. */
export function showsHelperContact(status: string) {
  return status === 'CONFIRMED' || status === 'ACTIVE' || status === 'COMPLETED';
}

export type HelperContactUser = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type HelperContactServant = {
  user?: HelperContactUser | null;
  bio?: string | null;
  rating?: number | null;
  verificationStatus?: string | null;
};

export function getHelperContact(booking: {
  status: string;
  servant?: HelperContactServant | null;
}) {
  if (!showsHelperContact(booking.status) || !booking.servant?.user) return null;
  const { user, bio, rating, verificationStatus } = booking.servant;
  if (!user.name && !user.phone && !user.email) return null;
  return {
    name: user.name,
    phone: user.phone,
    email: user.email,
    bio,
    rating,
    verificationStatus,
  };
}
