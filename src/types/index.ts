export interface User {
  id: string;
  name: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

export interface Room {
  id: string;
  name: string;
  users: User[];
  maxUsers: number;
}

export interface Background {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
}