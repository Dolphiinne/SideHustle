import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Package,
  FileDown,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
}

interface RevenueByDay {
  date: string;
  revenue: number;
}

interface BestSellingProduct {
  name: string;
  totalSold: number;
  revenue: number;
}

interface OrderStatusData {
  status: string;
  count: number;
}

const COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#6366f1"];

const STATUS_MAP: Record<string, string> = {
  pending: "Đang chờ",
  processing: "Đang xử lý",
  shipped: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });
  const [revenueByDay, setRevenueByDay] = useState<RevenueByDay[]>([]);
  const [bestSellingProducts, setBestSellingProducts] = useState<
    BestSellingProduct[]
  >([]);
  const [ordersByStatus, setOrdersByStatus] = useState<OrderStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const checkAdminAndFetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Vui lòng đăng nhập");
      navigate("/auth");
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      toast.error("Bạn không có quyền truy cập trang này");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    await Promise.all([
      fetchStats(),
      fetchRevenueByDay(),
      fetchBestSellingProducts(),
      fetchOrdersByStatus(),
    ]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("total, status");

      if (error) throw error;

      const totalRevenue =
        orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
      const totalOrders = orders?.length || 0;
      const pendingOrders =
        orders?.filter((o) => o.status === "pending").length || 0;
      const completedOrders =
        orders?.filter((o) => o.status === "delivered").length || 0;

      setStats({
        totalRevenue,
        totalOrders,
        pendingOrders,
        completedOrders,
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchRevenueByDay = async () => {
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("created_at, total")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const revenueMap = new Map<string, number>();
      orders?.forEach((order) => {
        const date = new Date(order.created_at).toLocaleDateString("vi-VN");
        const current = revenueMap.get(date) || 0;
        revenueMap.set(date, current + Number(order.total));
      });

      const chartData = Array.from(revenueMap.entries())
        .map(([date, revenue]) => ({ date, revenue }))
        .slice(-7); // Last 7 days

      setRevenueByDay(chartData);
    } catch (error: any) {
      console.error("Error fetching revenue by day:", error);
    }
  };

  const fetchBestSellingProducts = async () => {
    try {
      const { data, error } = await supabase.from("order_items").select(`
          quantity,
          price,
          products (name)
        `);

      if (error) throw error;

      const productMap = new Map<
        string,
        { totalSold: number; revenue: number }
      >();

      data?.forEach((item) => {
        const name = item.products?.name || "Unknown";
        const current = productMap.get(name) || { totalSold: 0, revenue: 0 };
        productMap.set(name, {
          totalSold: current.totalSold + item.quantity,
          revenue: current.revenue + item.quantity * Number(item.price),
        });
      });

      const topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 5);

      setBestSellingProducts(topProducts);
    } catch (error: any) {
      console.error("Error fetching best selling products:", error);
    }
  };
  const exportToExcel = () => {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Stats sheet
      const statsData = [
        ["Chỉ số", "Giá trị"],
        ["Tổng Doanh Thu", `${stats.totalRevenue.toLocaleString("vi-VN")}đ`],
        ["Tổng Đơn Hàng", stats.totalOrders],
        ["Đơn Đang Chờ", stats.pendingOrders],
        ["Đơn Hoàn Thành", stats.completedOrders],
      ];
      const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, statsSheet, "Thống Kê");

      // Revenue by day sheet
      const revenueData = [
        ["Ngày", "Doanh Thu (đ)"],
        ...revenueByDay.map((item) => [item.date, item.revenue]),
      ];
      const revenueSheet = XLSX.utils.aoa_to_sheet(revenueData);
      XLSX.utils.book_append_sheet(wb, revenueSheet, "Doanh Thu Theo Ngày");

      // Best selling products sheet
      const productsData = [
        ["Sản Phẩm", "Số Lượng Bán", "Doanh Thu (đ)"],
        ...bestSellingProducts.map((item) => [
          item.name,
          item.totalSold,
          item.revenue,
        ]),
      ];
      const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
      XLSX.utils.book_append_sheet(wb, productsSheet, "Sản Phẩm Bán Chạy");

      // Order status sheet
      const statusData = [
        ["Trạng Thái", "Số Lượng"],
        ...ordersByStatus.map((item) => [item.status, item.count]),
      ];
      const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
      XLSX.utils.book_append_sheet(wb, statusSheet, "Trạng Thái Đơn Hàng");

      // Export
      XLSX.writeFile(
        wb,
        `bao-cao-doanh-thu-${new Date().toLocaleDateString("vi-VN")}.xlsx`
      );
      toast.success("Đã xuất file Excel thành công");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Lỗi khi xuất file Excel");
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(20);
      doc.text("BÁO CÁO DOANH THU VÀ ĐƠN HÀNG", 14, 22);

      // Add date
      doc.setFontSize(11);
      doc.text(`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`, 14, 30);

      // Stats table
      doc.setFontSize(14);
      doc.text("Thống Kê Tổng Quan", 14, 40);

      autoTable(doc, {
        startY: 45,
        head: [["Chỉ số", "Giá trị"]],
        body: [
          ["Tổng Doanh Thu", `${stats.totalRevenue.toLocaleString("vi-VN")}đ`],
          ["Tổng Đơn Hàng", stats.totalOrders.toString()],
          ["Đơn Đang Chờ", stats.pendingOrders.toString()],
          ["Đơn Hoàn Thành", stats.completedOrders.toString()],
        ],
      });

      // Revenue by day
      const finalY1 = (doc as any).lastAutoTable.finalY || 70;
      doc.text("Doanh Thu 7 Ngày Gần Nhất", 14, finalY1 + 10);

      autoTable(doc, {
        startY: finalY1 + 15,
        head: [["Ngày", "Doanh Thu (đ)"]],
        body: revenueByDay.map((item) => [
          item.date,
          item.revenue.toLocaleString("vi-VN"),
        ]),
      });

      // Best selling products
      const finalY2 = (doc as any).lastAutoTable.finalY || 110;
      doc.text("Top 5 Sản Phẩm Bán Chạy", 14, finalY2 + 10);

      autoTable(doc, {
        startY: finalY2 + 15,
        head: [["Sản Phẩm", "Số Lượng", "Doanh Thu (đ)"]],
        body: bestSellingProducts.map((item) => [
          item.name,
          item.totalSold.toString(),
          item.revenue.toLocaleString("vi-VN"),
        ]),
      });

      // Order status
      const finalY3 = (doc as any).lastAutoTable.finalY || 150;
      doc.text("Trạng Thái Đơn Hàng", 14, finalY3 + 10);

      autoTable(doc, {
        startY: finalY3 + 15,
        head: [["Trạng Thái", "Số Lượng"]],
        body: ordersByStatus.map((item) => [
          item.status,
          item.count.toString(),
        ]),
      });

      // Save
      doc.save(
        `bao-cao-doanh-thu-${new Date().toLocaleDateString("vi-VN")}.pdf`
      );
      toast.success("Đã xuất file PDF thành công");
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast.error("Lỗi khi xuất file PDF");
    }
  };

  const fetchOrdersByStatus = async () => {
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("status");

      if (error) throw error;

      const statusMap = new Map<string, number>();
      orders?.forEach((order) => {
        const current = statusMap.get(order.status) || 0;
        statusMap.set(order.status, current + 1);
      });

      const chartData = Array.from(statusMap.entries()).map(
        ([status, count]) => ({
          status: STATUS_MAP[status] || status,
          count,
        })
      );

      setOrdersByStatus(chartData);
    } catch (error: any) {
      console.error("Error fetching orders by status:", error);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold animate-fade-in">
            Dashboard Thống Kê
          </h1>
          <div className="flex gap-2">
            <Button onClick={exportToExcel} variant="outline" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Xuất Excel
            </Button>
            <Button onClick={exportToPDF} variant="outline" className="gap-2">
              <FileDown className="h-4 w-4" />
              Xuất PDF
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card
            className="animate-fade-in hover-scale"
            style={{ animationDelay: "0.1s" }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tổng Doanh Thu
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalRevenue.toLocaleString("vi-VN")}đ
              </div>
            </CardContent>
          </Card>

          <Card
            className="animate-fade-in hover-scale"
            style={{ animationDelay: "0.2s" }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tổng Đơn Hàng
              </CardTitle>
              <ShoppingBag className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>

          <Card
            className="animate-fade-in hover-scale"
            style={{ animationDelay: "0.3s" }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Đơn Đang Chờ
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            </CardContent>
          </Card>

          <Card
            className="animate-fade-in hover-scale"
            style={{ animationDelay: "0.4s" }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Đơn Hoàn Thành
              </CardTitle>
              <Package className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedOrders}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart */}
          <Card className="animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <CardHeader>
              <CardTitle>Doanh Thu 7 Ngày Gần Nhất</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) =>
                      `${value.toLocaleString("vi-VN")}đ`
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Order Status Chart */}
          <Card className="animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <CardHeader>
              <CardTitle>Trạng Thái Đơn Hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, count }) => `${status}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {ordersByStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Best Selling Products */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.7s" }}>
          <CardHeader>
            <CardTitle>Top 5 Sản Phẩm Bán Chạy</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bestSellingProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "revenue")
                      return `${value.toLocaleString("vi-VN")}đ`;
                    return value;
                  }}
                />
                <Bar
                  dataKey="totalSold"
                  fill="hsl(var(--primary))"
                  name="Số lượng bán"
                />
                <Bar
                  dataKey="revenue"
                  fill="hsl(var(--secondary))"
                  name="Doanh thu"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default AdminDashboard;
