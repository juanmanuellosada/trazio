import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RegisterServiceWorker />
      {children}
    </>
  );
}
