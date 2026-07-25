import { getEnvironment, isStaging, isDevelopment } from "@/config/environment";

export const EnvironmentBanner = () => {
  const environment = getEnvironment();
  
  // Only show banner in non-production environments
  if (environment === 'production') {
    return null;
  }

  const bannerStyles = {
    development: 'bg-blue-600 text-white',
    staging: 'bg-orange-600 text-white'
  };

  const bannerText = {
    development: '🔧 DEVELOPMENT ENVIRONMENT',
    staging: '🚧 STAGING ENVIRONMENT - Testing Mode'
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium ${bannerStyles[environment as keyof typeof bannerStyles]}`}>
      {bannerText[environment as keyof typeof bannerText]}
    </div>
  );
};