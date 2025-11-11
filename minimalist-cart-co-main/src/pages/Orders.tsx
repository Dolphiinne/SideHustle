import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Header from "@/components/Header";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product_id: string;
  products: {
    name: string;
  };
}

interface Order {
  id: string;
  total: number;
  status: string;
  created_at: string;
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  ward: string;
  notes: string;
  order_items: OrderItem[];
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndFetchOrders();
  }, []);

  const checkAuthAndFetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Vui lòng đăng nhập để xem đơn hàng");
      navigate("/auth");
      return;
    }

    fetchOrders();
  };

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            quantity,
            price,
            product_id,
            products (
              name
            )
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setOrders(data || []);
    } catch (error: any) {
      toast.error("Không thể tải đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Đang chờ", variant: "secondary" },
      processing: { label: "Đang xử lý", variant: "default" },
      shipped: { label: "Đang giao", variant: "default" },
      delivered: { label: "Đã giao", variant: "outline" },
      cancelled: { label: "Đã hủy", variant: "destructive" },
    };

    const statusInfo = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
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

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Đơn Hàng Của Tôi</h1>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">Bạn chưa có đơn hàng nào</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Đơn hàng #{order.id.slice(0, 8)}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Đặt ngày: {new Date(order.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Sản phẩm:</h3>
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between py-2">
                        <div>
                          <p className="font-medium">{item.products.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Số lượng: {item.quantity} × {item.price.toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                        <p className="font-bold">
                          {(item.quantity * Number(item.price)).toLocaleString('vi-VN')}đ
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Thông tin giao hàng:</h3>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Người nhận:</span> {order.customer_name}</p>
                      <p><span className="text-muted-foreground">Số điện thoại:</span> {order.phone}</p>
                      <p><span className="text-muted-foreground">Địa chỉ:</span> {order.address}</p>
                      {order.ward && <p><span className="text-muted-foreground">Phường/Xã:</span> {order.ward}</p>}
                      {order.district && <p><span className="text-muted-foreground">Quận/Huyện:</span> {order.district}</p>}
                      <p><span className="text-muted-foreground">Tỉnh/Thành phố:</span> {order.city}</p>
                      {order.notes && <p><span className="text-muted-foreground">Ghi chú:</span> {order.notes}</p>}
                    </div>
                  </div>

                  <div className="border-t pt-4 flex justify-between items-center">
                    <span className="font-semibold">Tổng cộng:</span>
                    <span className="text-xl font-bold text-primary">
                      {Number(order.total).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
};

export default Orders;
