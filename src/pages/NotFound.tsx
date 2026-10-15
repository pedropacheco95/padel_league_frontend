import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: '#272C35' }}>
      <div className="text-center">
        <h1 className="mb-4 text-[48px] font-bold" style={{ color: '#ffffff' }}>404</h1>
        <p className="mb-4 text-[18px]" style={{ color: '#d1d5db' }}>Oops! Page not found</p>
        <a href="/" className="inline-flex items-center min-h-[40px] underline" style={{ color: '#9ACBD0' }}>
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
