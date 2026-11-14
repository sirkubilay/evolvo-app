

export function MountainMini({ size = 18 }) {
  return (
    <svg viewBox="-1 -2 62 46" width={size} height={Math.round(size * 44 / 60)} fill="none">
      <path d="M 0,42 L 13,17 L 21,29 L 31,0 L 41,22 L 50,11 L 60,42 Z" fill="#C9A84C" fillOpacity="0.3" />
      <path d="M 0,42 L 13,17 L 21,29 L 31,0 L 41,22 L 50,11 L 60,42" stroke="#C9A84C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 26,8 L 31,0 L 36,8 L 31,6 Z" fill="white" opacity="0.9" />
    </svg>
  );
}
