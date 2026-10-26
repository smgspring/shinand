// 큰 색 면(히어로 · 프로세스 · 푸터 카드)의 팔레트. 기존 톤앤매너(숲 초록 · 크림 · 세이지) 안에서 고릅니다.
// dark: 흰 글자를 올리는 어두운 바탕인지 (유리 재질과 글자색이 달라집니다)
export const THEMES = {
  forest: { label: "A 숲 초록", top: "#2c5a4c", bottom: "#14352b", dark: true },
  // 흰 글자 대비 4.5:1 이상이 되도록 위쪽을 한 단계 눌렀습니다
  sageGreen: { label: "B 세이지 그린", top: "#4e7e6c", bottom: "#335f50", dark: true },
  eucalyptus: { label: "C 유칼립투스", top: "#7ea595", bottom: "#5b8676", dark: true },
  sage: { label: "D 세이지 라이트", top: "#e6eee2", bottom: "#cfdecf", dark: false },
  cream: { label: "E 크림", top: "#f8f5ed", bottom: "#ebe5d6", dark: false }
};

export const DEFAULT_THEME = "sage";

// 비교 결과(2026-10-26): 히어로 · 푸터 카드는 밝은 세이지, 프로세스 섹션만 세이지 그린으로 강조
export const SCENE_THEMES = {
  hero: "sage",
  "footer-card": "sage",
  "process-band": "sageGreen"
};
let current = DEFAULT_THEME;

export const theme = () => THEMES[current];
export const setTheme = (name) => {
  if (THEMES[name]) current = name;
};
