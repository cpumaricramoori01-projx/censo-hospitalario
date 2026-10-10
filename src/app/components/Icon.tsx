import type { SVGProps } from "react";
export type IconName =
  | "bed"
  | "patient"
  | "admission"
  | "discharge"
  | "transfer"
  | "report"
  | "dashboard"
  | "settings"
  | "refresh"
  | "logout"
  | "check"
  | "warning";
const paths: Record<IconName, React.ReactNode> = {
  bed: (
    <>
      <path d="M3 5v15M3 16h18v4M3 10h5v6m0-6h10a3 3 0 0 1 3 3v3" />
      <circle cx="6" cy="8" r="2" />
    </>
  ),
  patient: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  admission: (
    <>
      <path d="M14 3h6v18h-6M3 12h12m-4-4 4 4-4 4" />
    </>
  ),
  discharge: (
    <>
      <path d="M10 3H4v18h6m-1-9h12m-4-4 4 4-4 4" />
    </>
  ),
  transfer: (
    <>
      <path d="M3 7h17l-4-4m4 4-4 4M21 17H4l4 4m-4-4 4-4" />
    </>
  ),
  report: (
    <>
      <path d="M14 3H5v18h14V8l-5-5v5h5M8 17v-4m4 4v-6m4 6v-3" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  settings: (
    <>
      <path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l3 3m6 6 3 3M6 18l3-3m6-6 3-3" />
      <circle cx="12" cy="12" r="5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6 7a7 7 0 0 1 12-2l2 2M4 17l2 2a7 7 0 0 0 12-2" />
    </>
  ),
  logout: (
    <>
      <path d="M10 3H4v18h6m-1-9h12m-4-4 4 4-4 4" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  warning: (
    <>
      <path d="m12 3 10 18H2L12 3Z" />
      <path d="M12 9v5m0 3h.01" />
    </>
  ),
};
export default function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
