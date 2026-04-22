// Minimal icon set — stroke-based, 1.5px
const Icon = ({ d, size = 16, fill = "none", stroke = "currentColor", sw = 1.5, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className}>
    {d}
  </svg>
);

const Icons = {
  Dashboard: (p) => <Icon {...p} d={<><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>} />,
  News:     (p) => <Icon {...p} d={<><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M7 8h10M7 12h10M7 16h6"/></>} />,
  Sponsors: (p) => <Icon {...p} d={<><path d="M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 6.5-7 11-7 11Z"/></>} />,
  Vorstand: (p) => <Icon {...p} d={<><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/><path d="M15 20c0-2 1.5-4 4-4s3 1.5 3 3"/></>} />,
  Theme:    (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18"/><circle cx="6.5" cy="11" r="1.2" fill="currentColor"/><circle cx="9" cy="6.5" r="1.2" fill="currentColor"/><circle cx="15" cy="6.5" r="1.2" fill="currentColor"/><circle cx="17.5" cy="11" r="1.2" fill="currentColor"/></>} />,
  Media:    (p) => <Icon {...p} d={<><rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="m21 16-5-5-9 9"/></>} />,
  Schedule: (p) => <Icon {...p} d={<><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 9h18M8 3v4M16 3v4"/><path d="M7 14h3M14 14h3M7 17h3"/></>} />,
  Settings: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>} />,
  Search:   (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>} />,
  Plus:     (p) => <Icon {...p} d={<><path d="M12 5v14M5 12h14"/></>} />,
  Arrow:    (p) => <Icon {...p} d={<><path d="M5 12h14M13 6l6 6-6 6"/></>} />,
  Chevron:  (p) => <Icon {...p} d={<><path d="m9 6 6 6-6 6"/></>} />,
  Down:     (p) => <Icon {...p} d={<><path d="m6 9 6 6 6-6"/></>} />,
  Eye:      (p) => <Icon {...p} d={<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>} />,
  EyeOff:   (p) => <Icon {...p} d={<><path d="m3 3 18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a18 18 0 0 1-3 3.8M6.1 6.1C3.8 7.9 2 12 2 12s4 7 10 7a10 10 0 0 0 4.9-1.3"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>} />,
  Calendar: (p) => <Icon {...p} d={<><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 9h18M8 3v4M16 3v4"/></>} />,
  Tag:      (p) => <Icon {...p} d={<><path d="M20 12 12 20l-9-9V3h8Z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor"/></>} />,
  Drag:     (p) => <Icon {...p} d={<><circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/></>} />,
  Check:    (p) => <Icon {...p} d={<><path d="m5 12 5 5L20 7"/></>} />,
  X:        (p) => <Icon {...p} d={<><path d="M6 6l12 12M18 6 6 18"/></>} />,
  Bold:     (p) => <Icon {...p} d={<><path d="M7 5h6a3 3 0 0 1 0 6H7zM7 11h7a3 3 0 0 1 0 6H7z"/></>} />,
  Italic:   (p) => <Icon {...p} d={<><path d="M19 4h-9M14 20H5M15 4 9 20"/></>} />,
  Link:     (p) => <Icon {...p} d={<><path d="M10 14a5 5 0 0 1 0-7l2-2a5 5 0 0 1 7 7l-1 1"/><path d="M14 10a5 5 0 0 1 0 7l-2 2a5 5 0 0 1-7-7l1-1"/></>} />,
  Image:    (p) => <Icon {...p} d={<><rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="m21 16-5-5-9 9"/></>} />,
  Heading:  (p) => <Icon {...p} d={<><path d="M6 4v16M18 4v16M6 12h12"/></>} />,
  List:     (p) => <Icon {...p} d={<><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>} />,
  External: (p) => <Icon {...p} d={<><path d="M15 3h6v6M10 14 21 3M21 14v7H3V3h7"/></>} />,
  Upload:   (p) => <Icon {...p} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></>} />,
  Bell:     (p) => <Icon {...p} d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>} />,
  Trash:    (p) => <Icon {...p} d={<><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>} />,
  Star:     (p) => <Icon {...p} d={<><path d="m12 2 3 7 7 .5-5.5 4.5L18 22l-6-4-6 4 1.5-8L2 9.5 9 9Z"/></>} />,
  Sliders:  (p) => <Icon {...p} d={<><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></>} />,
  Globe:    (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/></>} />,
  Menu:     (p) => <Icon {...p} d={<><path d="M3 6h18M3 12h18M3 18h18"/></>} />,
};

// Clubsoft wordmark
const Wordmark = ({ size = 22, dark = false }) => (
  <div className="flex items-center gap-2 select-none">
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="1" y="1" width="38" height="38" rx="8" fill="url(#cs-grad)" />
      <defs>
        <linearGradient id="cs-grad" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0" stopColor="oklch(0.62 0.22 290)" />
          <stop offset="1" stopColor="oklch(0.58 0.22 330)" />
        </linearGradient>
      </defs>
      <path d="M10 26 L20 14 L30 26" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="20" cy="27.5" r="1.8" fill="#fff" />
    </svg>
    <div className="font-display text-[20px] leading-none" style={{ letterSpacing: "-0.02em", color: "var(--ink)" }}>
      club<span style={{ color: "var(--forest-2)" }}>·</span>soft
    </div>
  </div>
);

window.Icons = Icons;
window.Wordmark = Wordmark;
