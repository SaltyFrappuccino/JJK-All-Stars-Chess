export type PlayerProfile = {
  nickname: string;
};

const STORAGE_KEY = "jjk-profile";

export function loadProfile(): PlayerProfile | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as PlayerProfile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: PlayerProfile): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
