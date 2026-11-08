// Misty ridgelines behind the hero: a cobalt blue-hour glow, three layered ranges, and a fade
// into the canvas so the product stage sits on the "desk" below them
export function Alpine() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[780px] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_60%,transparent)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_0%,rgb(82_102_235/0.30),transparent_72%)]" />
      <svg
        viewBox="0 0 1440 560"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 h-[560px] w-full"
      >
        <defs>
          <linearGradient id="ridge-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7f8fff" stopOpacity="0.26" />
            <stop offset="1" stopColor="#171721" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ridge-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b4590" stopOpacity="0.42" />
            <stop offset="1" stopColor="#171721" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ridge-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#252742" stopOpacity="0.9" />
            <stop offset="1" stopColor="#171721" stopOpacity="0" />
          </linearGradient>
          <filter id="ridge-soft" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>
        <path
          filter="url(#ridge-soft)"
          d="M0 300 L110 240 L190 280 L320 170 L430 260 L540 205 L660 285 L780 180 L900 270 L1010 215 L1130 290 L1250 225 L1340 270 L1440 235 V560 H0Z"
          fill="url(#ridge-far)"
          stroke="rgb(237 237 243 / 0.1)"
        />
        <path
          d="M0 380 L90 330 L200 365 L330 285 L450 350 L590 300 L700 360 L830 290 L950 350 L1080 305 L1200 365 L1320 320 L1440 355 V560 H0Z"
          fill="url(#ridge-mid)"
          stroke="rgb(237 237 243 / 0.09)"
        />
        <path
          d="M0 450 L140 410 L260 440 L400 385 L520 435 L660 400 L790 445 L930 395 L1060 440 L1190 405 L1320 440 L1440 415 V560 H0Z"
          fill="url(#ridge-near)"
          stroke="rgb(237 237 243 / 0.07)"
        />
      </svg>
    </div>
  );
}
