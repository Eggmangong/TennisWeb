'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProfile, updateProfile } from '@/lib/api';
import type { Profile, UserWithProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

const genders = [
  { value: '', label: 'Prefer not to say' },
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'O', label: 'Other' },
];

const dominantHands = [
  { value: '', label: 'Select' },
  { value: 'R', label: 'Right' },
  { value: 'L', label: 'Left' },
];

const backhands = [
  { value: '', label: 'Select' },
  { value: '1H', label: 'One-handed' },
  { value: '2H', label: 'Two-handed' },
];

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
  }), [data]);

  const [form, setForm] = useState<Profile>(initial);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>('');
  const [editing, setEditing] = useState<boolean>(false);

  useEffect(() => setForm(initial), [initial]);

  const mutation = useMutation({
    mutationFn: (payload: Profile & { avatar?: File | null }) => updateProfile(payload),
    onSuccess: async () => {
      setMessage('Saved successfully.');
      await qc.invalidateQueries({ queryKey: ['profile'] });
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
    setAvatarFile(file);
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
              <Item label="Location" value={p?.location || '-'} />
              <Item label="Gender" value={labelOf(genders, p?.gender)} />
              <Item label="Age" value={p?.age ?? '-'} />
              <Item label="Years Playing" value={p?.years_playing ?? '-'} />
              <Item label="Skill Level" value={p?.skill_level ?? '-'} />
              <Item label="Dominant Hand" value={labelOf(dominantHands, p?.dominant_hand)} />
              <Item label="Backhand Type" value={labelOf(backhands, p?.backhand_type)} />
              <div className="sm:col-span-2">
                <div className="text-sm font-medium text-gray-700">Bio</div>
                <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{p?.bio || '-'}</div>
              </div>
            </div>
          </div>
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
            <label className="block text-sm font-medium text-gray-700">Display Name</label>
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
            <input type="number" step="0.1" min={1} max={7} name="skill_level" value={form.skill_level ?? ''} onChange={onNumber('skill_level')} className="mt-1 block w-full rounded-md border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Dominant Hand</label>
            <select name="dominant_hand" value={form.dominant_hand ?? ''} onChange={onChange} className="mt-1 block w-full rounded-md border px-3 py-2">
              {dominantHands.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Backhand Type</label>
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
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Avatar</label>
            <div className="mt-1 flex items-center gap-4">
              {data?.profile?.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.profile.avatar_url} alt="avatar" className="h-16 w-16 rounded-full object-cover" />
              )}
              <input type="file" accept="image/*" onChange={onAvatar} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={mutation.isPending} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50">
            {mutation.isPending ? 'Saving...' : 'Save Profile'}
          </button>
          <button type="button" onClick={() => { setEditing(false); setForm(initial); setAvatarFile(null); setMessage(''); }} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">
            Cancel
          </button>
          {message && <span className="text-sm text-gray-600">{message}</span>}
        </div>
      </form>
    </div>
  );
}

function labelOf(list: { value: string; label: string }[], v?: string | null) {
  const f = list.find((x) => x.value === (v ?? ''));
  return f?.label ?? '-';
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="mt-1 text-sm text-gray-900">{value}</div>
    </div>
  );
}