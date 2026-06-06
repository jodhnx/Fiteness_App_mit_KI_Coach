export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="contents opacity-100 transition-opacity duration-150">{children}</div>;
}
