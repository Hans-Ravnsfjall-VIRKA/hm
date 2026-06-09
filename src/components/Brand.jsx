import { APP } from '../config';

// VIRKA company wordmark. fill:currentColor so it picks up the navy brand
// colour from CSS (.virka-logo).
export function VirkaLogo({ className = 'virka-logo' }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 804.24 224.01"
      fill="currentColor" role="img" aria-label="VIRKA">
      <path d="M362.9,136.19h18.42c24.49,0,33.45-14.23,33.45-40.14v-54.77c0-24.01-6.42-40.62-34.42-40.62h-106.78l19.98,26.94h78.22c13.52,0,16.31,4.65,16.31,18.68v44.79c0,14.6-2.63,18.19-14.92,18.19h-61.57l85.34,114.76h31.07l-65.09-87.82Z" />
      <rect x="215.77" width="26.91" height="223.52" />
      <polygon points="87.77 182.72 29.43 .08 0 .08 71.1 223.67 104.15 223.67 175.51 .08 148.27 .08 87.77 182.72" />
      <rect x="458.77" width="26.9" height="223.52" />
      <polygon points="578.72 .06 493.26 109.43 578.71 223.81 609.43 223.81 524.87 109.49 610.63 .41 578.72 .06" />
      <polygon points="733.13 .08 700.08 .08 628.72 223.67 655.95 223.67 716.45 41.02 774.38 222.32 774.8 223.67 804.24 223.67 733.13 .08" />
    </svg>
  );
}

// Official competition mark (user-supplied asset).
export function WcLogo({ className = 'wc-logo' }) {
  return <img className={className} src="./wc-logo.webp" alt="FIFA World Cup 2026" />;
}

// Top-bar lockup: VIRKA wordmark + the app's "Tippi" name.
export function BrandLockup() {
  return (
    <div className="brand">
      <VirkaLogo />
      <span className="divider" />
      <span className="tippi">Tippi</span>
    </div>
  );
}

export default BrandLockup;
