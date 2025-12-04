export const genders = [
  { value: '', label: 'Prefer not to say' },
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'O', label: 'Other' },
];

export const dominantHands = [
  { value: '', label: 'Select' },
  { value: 'R', label: 'Right' },
  { value: 'L', label: 'Left' },
];

export const backhands = [
  { value: '', label: 'Select' },
  { value: '1H', label: 'One-handed' },
  { value: '2H', label: 'Two-handed' },
];

export const courtTypes = [
  { value: 'hard', label: 'Hard' },
  { value: 'clay', label: 'Clay' },
  { value: 'grass', label: 'Grass' },
];

export const matchTypes = [
  { value: 'singles', label: 'Singles' },
  { value: 'doubles', label: 'Doubles' },
];

export const playIntentions = [
  { value: 'casual', label: 'Casual' },
  { value: 'competitive', label: 'Competitive' },
];

export const languages = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: 'Chinese' },
];

export function labelOf(list: { value: string; label: string }[], v?: string | null) {
  const f = list.find((x) => x.value === (v ?? ''));
  return f?.label ?? '-';
}
