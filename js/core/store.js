/**
 * Data layer. Stores ONLY numbers and plan progress — never photos,
 * video frames or landmark coordinates.
 *
 * Supabase mode: tables `analyses` and `plans` protected by row-level
 * security (see supabase/schema.sql). Demo mode: localStorage.
 */
import { getSupabase } from './supabase.js';
import { storage } from './utils.js';

const LOCAL = { analyses: 'hiq:analyses', plans: 'hiq:plans' };
const localId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

/* ------------------------------------------------------------------ */
/* Analyses                                                            */
/* ------------------------------------------------------------------ */

/**
 * @param {{ overall:number, scores:object, values:object, face_shape:string, quality:number }} row
 */
export async function saveAnalysis(row) {
  const record = {
    overall: row.overall,
    scores: row.scores,
    metrics: row.values,
    face_shape: row.face_shape,
    quality: row.quality,
  };
  const sb = await getSupabase();
  if (!sb) {
    const list = storage.get(LOCAL.analyses, []);
    const saved = { id: localId(), created_at: new Date().toISOString(), ...record };
    list.push(saved);
    storage.set(LOCAL.analyses, list);
    return saved;
  }
  const { data, error } = await sb.from('analyses').insert(record).select().single();
  if (error) throw error;
  return data;
}

export async function listAnalyses() {
  const sb = await getSupabase();
  if (!sb) return storage.get(LOCAL.analyses, []).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const { data, error } = await sb.from('analyses').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data.map((row) => ({ ...row, overall: Number(row.overall) }));
}

export async function latestAnalysis() {
  const all = await listAnalyses();
  return all.at(-1) || null;
}

export async function deleteAnalysis(id) {
  const sb = await getSupabase();
  if (!sb) {
    storage.set(LOCAL.analyses, storage.get(LOCAL.analyses, []).filter((a) => a.id !== id));
    return;
  }
  const { error } = await sb.from('analyses').delete().eq('id', id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Plans                                                               */
/* ------------------------------------------------------------------ */

export async function getActivePlan() {
  const sb = await getSupabase();
  if (!sb) return storage.get(LOCAL.plans, []).find((p) => p.active) || null;
  const { data, error } = await sb.from('plans').select('*').eq('active', true).order('created_at', { ascending: false }).limit(1);
  if (error) throw error;
  return data[0] || null;
}

/** Saves a new plan and deactivates any previous one. */
export async function savePlan(plan) {
  const sb = await getSupabase();
  if (!sb) {
    const list = storage.get(LOCAL.plans, []).map((p) => ({ ...p, active: false }));
    const row = { id: localId(), created_at: new Date().toISOString(), timeline: plan.timeline, plan, completed: [], active: true };
    list.push(row);
    storage.set(LOCAL.plans, list);
    return row;
  }
  const { error: offErr } = await sb.from('plans').update({ active: false }).eq('active', true);
  if (offErr) throw offErr;
  const { data, error } = await sb.from('plans').insert({ timeline: plan.timeline, plan, completed: [], active: true }).select().single();
  if (error) throw error;
  return data;
}

export async function updatePlanProgress(id, completed) {
  const sb = await getSupabase();
  if (!sb) {
    storage.set(
      LOCAL.plans,
      storage.get(LOCAL.plans, []).map((p) => (p.id === id ? { ...p, completed, updated_at: new Date().toISOString() } : p)),
    );
    return;
  }
  const { error } = await sb.from('plans').update({ completed, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Account-level                                                       */
/* ------------------------------------------------------------------ */

export async function exportData() {
  const sb = await getSupabase();
  const analyses = await listAnalyses();
  let plans;
  if (!sb) plans = storage.get(LOCAL.plans, []);
  else {
    const { data, error } = await sb.from('plans').select('*').order('created_at');
    if (error) throw error;
    plans = data;
  }
  return { exported_at: new Date().toISOString(), analyses, plans };
}

/** Deletes every saved score and plan but keeps the account. */
export async function deleteAllData() {
  const sb = await getSupabase();
  if (!sb) {
    storage.remove(LOCAL.analyses);
    storage.remove(LOCAL.plans);
    return;
  }
  const { data: s } = await sb.auth.getSession();
  const uid = s.session?.user?.id;
  const r1 = await sb.from('analyses').delete().eq('user_id', uid);
  const r2 = await sb.from('plans').delete().eq('user_id', uid);
  if (r1.error || r2.error) throw r1.error || r2.error;
}

/**
 * Permanently deletes the account. The `delete_my_account` SQL function
 * removes the auth user; ON DELETE CASCADE removes all their rows.
 */
export async function deleteAccount() {
  const sb = await getSupabase();
  if (!sb) {
    await deleteAllData();
    storage.remove('hiq:age');
    return;
  }
  const { error } = await sb.rpc('delete_my_account');
  if (error) throw error;
  await sb.auth.signOut();
}
