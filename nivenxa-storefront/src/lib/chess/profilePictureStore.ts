import { getSupabaseAdmin } from './supabase'
import { picturePath, type Profile, type ProfileStore } from './profilePicture'

const BUCKET = 'chess-profile-pictures'

/** Supabase-backed store: a row in chess_profiles plus a private storage object. Used only by the server route (service role). */
export const supabaseProfileStore: ProfileStore = {
  async getProfile(userId): Promise<Profile> {
    const { data, error } = await getSupabaseAdmin().from('chess_profile_pictures').select('has_picture, avatar_version').eq('user_id', userId).maybeSingle()
    if (error) throw error
    const version = data?.avatar_version ?? 0
    // The object path is derived from the caller's own id and the version: no stored path is ever trusted.
    return { avatarPath: data?.has_picture ? picturePath(userId, version) : null, version }
  },
  async put(path, webp) {
    const { error } = await getSupabaseAdmin().storage.from(BUCKET).upload(path, webp, { contentType: 'image/webp', upsert: false })
    if (error) throw error
  },
  async read(path) {
    const { data, error } = await getSupabaseAdmin().storage.from(BUCKET).download(path)
    if (error || !data) return null
    return Buffer.from(await data.arrayBuffer())
  },
  async remove(path) {
    const { error } = await getSupabaseAdmin().storage.from(BUCKET).remove([path])
    if (error) throw error
  },
  async setProfile(userId, p) {
    const { error } = await getSupabaseAdmin()
      .from('chess_profile_pictures')
      .upsert({ user_id: userId, has_picture: p.avatarPath !== null, avatar_version: p.version, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) throw error
  },
}
