export interface Player {
  id: string;
  name: string;
  winRate: number;
  points: number;
  matches: number;
  wins: number;
  losses: number;
}

export interface Match {
  id: string;
  date: string;
  player1: Player;
  player2: Player;
  score: string;
  winner: string;
  location: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

// Backend auth/user + profile types
export interface Profile {
  avatar_url?: string | null;
  bio?: string;
  skill_level?: number | null; // e.g. 3.0, 4.5
  location?: string;
  gender?: 'M' | 'F' | 'O' | '';
  display_name?: string;
  age?: number | null;
  years_playing?: number | null;
  dominant_hand?: 'R' | 'L' | '';
  backhand_type?: '1H' | '2H' | '';
}

export interface UserWithProfile {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile?: Profile | null;
}