type GoogleIconProps = {
  className?: string;
};

export function GoogleIcon({ className }: GoogleIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.8 12.23c0-.68-.06-1.34-.17-1.98H12v3.75h5.53a4.73 4.73 0 0 1-2.06 3.1v2.58h3.33c1.95-1.8 3.08-4.44 3.08-7.45Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.79 0 5.13-.92 6.84-2.5l-3.33-2.58c-.93.62-2.12.98-3.51.98-2.69 0-4.97-1.82-5.8-4.28H2.74v2.67A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.2 13.62a6 6 0 0 1 0-3.24V7.72H2.74a10 10 0 0 0 0 8.58l3.46-2.68Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.08c1.52 0 2.89.52 3.97 1.54l2.98-2.98A10 10 0 0 0 12 2a10 10 0 0 0-9.26 5.72L6.2 10.4C7.03 7.94 9.31 5.08 12 5.08Z"
        fill="#EA4335"
      />
    </svg>
  );
}
