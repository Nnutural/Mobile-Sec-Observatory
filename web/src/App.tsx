import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { colors } from "@/design/colors";

export function App() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.gray[50] }}>
      <Header />
      <Outlet />
    </div>
  );
}
