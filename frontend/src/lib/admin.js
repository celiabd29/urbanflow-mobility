import api from '@/lib/api'

/** Liste des comptes avec statistiques agrégées (réservé au staff). */
export async function getAdminUsers({ signal } = {}) {
  const { data } = await api.get('/admin/users/', { signal })
  return data
}

/** Détail d'un compte : profil, habitudes par mode, derniers trajets. */
export async function getAdminUser(id, { signal } = {}) {
  const { data } = await api.get(`/admin/users/${id}/`, { signal })
  return data
}

/** Met à jour un compte : { is_active } (suspendre) ou { is_staff } (admin). */
export async function updateAdminUser(id, changes) {
  const { data } = await api.patch(`/admin/users/${id}/`, changes)
  return data
}

/** Supprime définitivement un compte. */
export async function deleteAdminUser(id) {
  await api.delete(`/admin/users/${id}/`)
}
