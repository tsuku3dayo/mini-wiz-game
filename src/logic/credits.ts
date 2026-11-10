// クレジット（仕様書 §11.5「クレジット」、TD-0002 §2）。画面はこの順に並べるだけ
// 名前「つくだ よしはる」は本人（オーナー）の了承を得て載せている（仕様書 §32、2026-11-10）

export interface Credit {
  readonly role: string;
  readonly name: string;
}

const OWNER = 'つくだ よしはる';
const CLAUDE = 'CLAUDE CODE';

export const CREDITS: readonly Credit[] = Object.freeze([
  Object.freeze({ role: 'PRODUCER', name: OWNER }),
  Object.freeze({ role: 'DIRECTOR', name: OWNER }),
  Object.freeze({ role: 'GAME DESIGNER', name: OWNER }),
  Object.freeze({ role: 'GRAPHIC DESIGNER', name: CLAUDE }),
  Object.freeze({ role: 'SOUND CREATOR', name: CLAUDE }),
  Object.freeze({ role: 'PROGRAMMER', name: CLAUDE }),
]);
