const CUBES = [
  { l: "7%", t: "18%", s: "h-28 w-28" },
  { l: "78%", t: "10%", s: "h-36 w-36" },
  { l: "70%", t: "62%", s: "h-24 w-24" },
  { l: "12%", t: "72%", s: "h-32 w-32" },
];

export default function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#edf5ff]">
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 14% 20%, rgba(59,130,246,0.22), transparent 30%), radial-gradient(circle at 82% 18%, rgba(14,165,233,0.18), transparent 24%), radial-gradient(circle at 78% 78%, rgba(255,215,0,0.16), transparent 28%), linear-gradient(135deg, #f8fbff 0%, #edf5ff 44%, #eaf2ff 100%)" }} />
      <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(45deg, rgba(37,99,235,0.055) 25%, transparent 25%, transparent 75%, rgba(37,99,235,0.055) 75%), linear-gradient(45deg, rgba(255,215,0,0.06) 25%, transparent 25%, transparent 75%, rgba(255,215,0,0.06) 75%)", backgroundPosition: "0 0, 36px 36px", backgroundSize: "72px 72px" }} />
      <div className="absolute inset-0 opacity-55" style={{ backgroundImage: "linear-gradient(rgba(15,23,42,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.07) 1px, transparent 1px)", backgroundSize: "36px 36px", maskImage: "radial-gradient(circle at center, black 55%, transparent 100%)", WebkitMaskImage: "radial-gradient(circle at center, black 55%, transparent 100%)" }} />
      <div className="absolute -left-[12vw] top-[-12vw] h-[44vw] w-[44vw] rounded-full bg-blue-400/20 blur-[120px]" />
      <div className="absolute bottom-[-18vw] right-[-10vw] h-[48vw] w-[48vw] rounded-full bg-[#FFD700]/15 blur-[150px]" />
      {CUBES.map((c) => (
        <div key={c.l + c.t} className={`absolute ${c.s} rounded-[2rem] border border-white/60 bg-white/20 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.28)] backdrop-blur-md`} style={{ left: c.l, top: c.t, transform: "rotate(12deg)" }} />
      ))}
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at center, transparent 0%, transparent 52%, rgba(15,23,42,0.08) 100%)" }} />
    </div>
  );
}
