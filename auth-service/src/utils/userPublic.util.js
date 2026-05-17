function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
  };
}

module.exports = { toPublicUser };
