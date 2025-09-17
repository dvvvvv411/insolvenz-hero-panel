import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to verwaltung by default
    navigate("/dashboard/verwaltung", { replace: true });
  }, [navigate]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;