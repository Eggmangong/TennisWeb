'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProfile, updateProfile } from '@/lib/api';
import type { Profile, UserWithProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Calendar from '@/components/Calendar';
import { backhands, courtTypes, dominantHands, genders, labelOf, languages, matchTypes, playIntentions } from '@/lib/profileOptions';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const { data, isLoading } = useQuery<UserWithProfile>({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: isAuthenticated,
  });

  const initial: Profile = useMemo(() => ({
    bio: data?.profile?.bio ?? '',
    skill_level: data?.profile?.skill_level ?? undefined,
    location: data?.profile?.location ?? '',
    gender: (data?.profile?.gender as any) ?? '',
    display_name: data?.profile?.display_name ?? '',
    age: data?.profile?.age ?? undefined,
    years_playing: data?.profile?.years_playing ?? undefined,
    dominant_hand: (data?.profile?.dominant_hand as any) ?? '',
    backhand_type: (data?.profile?.backhand_type as any) ?? '',
    preferred_court_types: data?.profile?.preferred_court_types ?? [],
    preferred_match_types: data?.profile?.preferred_match_types ?? [],
    play_intentions: data?.profile?.play_intentions ?? [],
    preferred_languages: data?.profile?.preferred_languages ?? [],
  }), [data]);

  const [form, setForm] = useState<Profile>(initial);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string>('');
  const [editing, setEditing] = useState<boolean>(false);

  useEffect(() => setForm(initial), [initial]);

  // Cleanup preview URL on unmount/change
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const mutation = useMutation({
    mutationFn: (payload: Profile & { avatar?: File | null }) => updateProfile(payload),
    onSuccess: async () => {
      setMessage('Saved successfully.');
      await qc.invalidateQueries({ queryKey: ['profile'] });
      // reset file input + preview
      setAvatarFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setEditing(false);
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      if (data) {
        const parts: string[] = [];
        Object.entries(data).forEach(([k, v]) => parts.push(`${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`));
        setMessage(`Save failed: ${parts.join(' | ')}`);
      } else {
        setMessage(`Save failed: ${err?.message ?? 'Unknown error'}`);
      }
    },
  });

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onNumber = (name: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setForm((prev) => ({ ...prev, [name]: v === '' ? undefined : Number(v) }));
  };

  const onAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      // revoke old preview url if any
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setAvatarFile(file);
    } else {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setAvatarFile(null);
    }
  };

  const triggerChooseFile = () => {
    if (fileInputRef.current) {
      // allow re-selecting the same file by clearing the value first
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const toggleMulti = (
    name: 'preferred_court_types' | 'preferred_match_types' | 'play_intentions' | 'preferred_languages',
    value: string,
  ) => {
    setForm((prev) => {
      const current = new Set(prev[name] ?? []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return { ...prev, [name]: Array.from(current) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    await mutation.mutateAsync({ ...form, avatar: avatarFile ?? undefined });
  };

  // Render view mode (read-only)
  if (!editing) {
    const p = data?.profile;
    return (
      <div className="space-y-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Your Profile</h2>
                <p className="mt-1 text-sm text-gray-500">View your tennis profile.</p>
              </div>
              <button onClick={() => setEditing(true)} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                Edit Profile
              </button>
            </div>
            <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p?.avatar_url || 'https://via.placeholder.com/96'}
                    alt="avatar"
                    className="h-24 w-24 rounded-full object-cover"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 w-full">
                  <Item label="Display Name" value={p?.display_name || '-'} />
                  <Item label="Username" value={`@${data?.username}`} />
                  <Item label="Location" value={p?.location || '-'} />
                  <Item label="Gender" value={labelOf(genders, p?.gender)} />
                  <Item label="Age" value={p?.age ?? '-'} />
                  <Item label="Years Playing" value={p?.years_playing ?? '-'} />
                  <Item label="Skill Level" value={p?.skill_level ?? '-'} />
                  <Item label="Forehand" value={labelOf(dominantHands, p?.dominant_hand)} />
                  <Item label="Backhand" value={labelOf(backhands, p?.backhand_type)} />
                  <Item
                    label="Court Types"
                    value={(p?.preferred_court_types ?? []).length ? (p?.preferred_court_types ?? []).map((v) => labelOf(courtTypes, v)).join(', ') : '-'}
                  />
                  <Item
                    label="Match Types"
                    value={(p?.preferred_match_types ?? []).length ? (p?.preferred_match_types ?? []).map((v) => labelOf(matchTypes, v)).join(', ') : '-'}
                  />
                  <Item
                    label="Play Intentions"
                    value={(p?.play_intentions ?? []).length ? (p?.play_intentions ?? []).map((v) => labelOf(playIntentions, v)).join(', ') : '-'}
                  />
                  <Item
                    label="Languages"
                    value={(p?.preferred_languages ?? []).length ? (p?.preferred_languages ?? []).map((v) => labelOf(languages, v)).join(', ') : '-'}
                  />
                  <div className="sm:col-span-2">
                    <div className="text-sm font-medium text-gray-700">Bio</div>
                    <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{p?.bio || '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Check-in */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Tennis Calendar</h3>
            <Calendar />
          </div>
      </div>
    );
  }

  // Render edit form
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg font-medium text-gray-900">Edit Profile</h2>
        <p className="mt-1 text-sm text-gray-500">Update your tennis profile and save.</p>
      </div>
      <form onSubmit={handleSubmit} className="border-t border-gray-200 px-4 py-5 sm:px-6 space-y-6">
        <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input name="display_name" value={form.display_name ?? ''} onChange={onChange} className="mt-1 block w-full rounded-md border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input name="location" value={form.location ?? ''} onChange={onChange} className="mt-1 block w-full rounded-md border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <select name="gender" value={form.gender ?? ''} onChange={onChange} className="mt-1 block w-full rounded-md border px-3 py-2">
              {genders.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Age</label>
            <input type="number" min={0} name="age" value={form.age ?? ''} onChange={onNumber('age')} className="mt-1 block w-full rounded-md border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Years Playing</label>
            <input type="number" min={0} name="years_playing" value={form.years_playing ?? ''} onChange={onNumber('years_playing')} className="mt-1 block w-full rounded-md border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Skill Level (e.g. 3.0, 4.5)</label>
            <input type="number" step="0.5" min={1} max={7} name="skill_level" value={form.skill_level ?? ''} onChange={onNumber('skill_level')} className="mt-1 block w-full rounded-md border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Forehand</label>
            <select name="dominant_hand" value={form.dominant_hand ?? ''} onChange={onChange} className="mt-1 block w-full rounded-md border px-3 py-2">
              {dominantHands.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Backhand</label>
            <select name="backhand_type" value={form.backhand_type ?? ''} onChange={onChange} className="mt-1 block w-full rounded-md border px-3 py-2">
              {backhands.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Bio</label>
            <textarea name="bio" value={form.bio ?? ''} onChange={onChange} rows={4} className="mt-1 block w-full rounded-md border px-3 py-2" />
          </div>
          {/* Multi-select preferences */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700">Court Types</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {courtTypes.map((o) => (
                <label key={o.value} className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={(form.preferred_court_types ?? []).includes(o.value)}
                    onChange={() => toggleMulti('preferred_court_types', o.value)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
          
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700">Match Types</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {matchTypes.map((o) => (
                <label key={o.value} className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={(form.preferred_match_types ?? []).includes(o.value)}
                    onChange={() => toggleMulti('preferred_match_types', o.value)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="block text-sm font-medium text-gray-700">Play Intentions</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {playIntentions.map((o) => (
                <label key={o.value} className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={(form.play_intentions ?? []).includes(o.value)}
                    onChange={() => toggleMulti('play_intentions', o.value)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="block text-sm font-medium text-gray-700">Preferred Languages</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {languages.map((o) => (
                <label key={o.value} className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={(form.preferred_languages ?? []).includes(o.value)}
                    onChange={() => toggleMulti('preferred_languages', o.value)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Avatar</label>
            <div className="mt-2 flex items-center gap-4">
              {/* Preview: show selected preview first, then fallback to existing avatar */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl || data?.profile?.avatar_url || 'https://via.placeholder.com/64'}
                alt="avatar preview"
                className="h-16 w-16 rounded-full object-cover"
              />
              {/* Hidden native file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onAvatar}
                className="hidden"
              />
              <button
                type="button"
                onClick={triggerChooseFile}
                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                {avatarFile ? 'Change Image' : 'Choose Image'}
              </button>
              {/* Selected file name (no more 'No file chosen') */}
              {avatarFile && <span className="text-sm text-gray-600 truncate max-w-[200px]">{avatarFile.name}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={mutation.isPending} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50">
            {mutation.isPending ? 'Saving...' : 'Save Profile'}
          </button>
          <button type="button" onClick={() => { setEditing(false); setForm(initial); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setAvatarFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; setMessage(''); }} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">
            Cancel
          </button>
          {message && <span className="text-sm text-gray-600">{message}</span>}
        </div>
      </form>
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="mt-1 text-sm text-gray-900">{value}</div>
    </div>
  );
}