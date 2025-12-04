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
  // Multi-select preferences
  preferred_court_types?: string[]; // ['hard','clay','grass']
  preferred_match_types?: string[]; // ['singles','doubles']
  play_intentions?: string[]; // ['casual','competitive']
  preferred_languages?: string[]; // ['en','zh']
}

export interface UserWithProfile {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile?: Profile | null;
}

// Calendar check-ins
export interface CheckInItem {
  date: string;
  duration: number;
  start_time?: string | null;
  end_time?: string | null;
}

export interface CheckInMonth {
  checkins: CheckInItem[];
}

// Matching and Friends
export interface BriefUserProfile extends Profile {}

export interface BriefUser {
  id: number;
  username: string;
  profile?: BriefUserProfile | null;
}

export interface Recommendation {
  user: UserWithProfile; // use full profile shape for recommendation detail
  score: number;
}

export interface AIRecommendationResult {
  user: UserWithProfile;
  score: number; // underlying algorithmic score (from candidates list)
  reason: string; // LLM generated explanation why this is a good match
  mode: 'ai';
}

export interface RecommendationPair {
  algo?: Recommendation; // traditional algorithm recommendation
  ai?: AIRecommendationResult; // AI-based choice
}

export interface FriendItem {
  id: number; // friend relation id
  friend: BriefUser;
  created_at: string;
}

// Chat
export interface ChatThread {
  id: number;
  other_user: BriefUser;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  sender: BriefUser;
  content: string;
  created_at: string;
}